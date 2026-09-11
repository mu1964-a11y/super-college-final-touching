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
  School,
  Briefcase,
  Search,
  FileText,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateStudentFeeBreakdown } from '../lib/feeCalculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface VerificationData {
  type: 'challan' | 'receipt' | 'admission' | 'card' | 'staff_payroll' | 'general';
  id: string;
  student?: any;
  admission?: any;
  staff?: any;
  month?: string;
  verifiedAt: string;
  status: 'verified' | 'unverified' | 'loading' | 'error';
  errorMessage?: string;
}

// Check if string matches UUID format
function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// Normalize raw DB student / admission record into unified camelCase object
function normalizeStudentRecord(rawStudent: any, rawAdmission?: any): any {
  if (!rawStudent && !rawAdmission) return null;
  const s = rawStudent || {};
  const a = rawAdmission || {};

  const totalPkg = Number(s.total_package ?? s.totalPackage ?? a.total_package ?? a.totalPackage ?? 0);
  const feeRcv = Number(s.fee_received ?? s.feeReceived ?? a.fee_received ?? a.feeReceived ?? 0);

  return {
    id: s.id || a.student_id || a.id || '',
    studentId: a.student_id || s.id || '',
    admissionId: s.admission_id || a.id || '',
    fullName: s.full_name || s.fullName || a.full_name || a.fullName || 'Student',
    fatherName: s.father_name || s.fatherName || a.father_name || a.fatherName || 'N/A',
    rollNo: s.college_no || s.id || a.college_no || a.student_id || '',
    collegeNo: s.college_no || a.college_no || '',
    bayFormNo: s.bay_form_no || a.bay_form_no || '',
    boardRollNo: s.board_roll_no || a.board_roll_no || '',
    category: s.category || a.category || 'General',
    group: s.group || a.group || 'F.Sc',
    section: s.section || a.section || '',
    gender: s.gender || a.gender || 'Male',
    dob: s.dob || a.dob || '',
    contact: s.contact || a.contact_number || a.contact || '',
    fatherContact: a.father_contact || s.fatherContact || '',
    address: s.address || a.address || '',
    email: s.email || a.email || '',
    bloodGroup: s.blood_group || a.bloodGroup || '',
    session: s.session || a.session || '2026-28',
    academicPart: s.academic_part || a.academic_part || 'Part-1',
    programType: s.program_type || a.program_type || 'Yearly',
    totalPackage: totalPkg,
    feeReceived: feeRcv,
    monthlyFee: Number(s.monthly_fee ?? a.monthly_fee ?? 0),
    admissionFee: Number(s.admission_fee ?? a.admission_fee ?? 0),
    feeLedger: s.fee_ledger || a.fee_ledger || null,
    feeHistory: s.fee_history || a.fee_history || [],
    photo: s.photo_url || s.photo || a.photo_url || a.photo || '',
    createdAt: s.created_at || a.created_at || '',
    // Preserve raw fields for compatibility
    total_package: totalPkg,
    fee_received: feeRcv,
    full_name: s.full_name || a.full_name,
    father_name: s.father_name || a.father_name,
  };
}

export default function PublicVerificationView({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const [data, setData] = useState<VerificationData>({
    type: 'general',
    id: '',
    verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
    status: 'loading'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Perform multi-stage, fault-tolerant verification lookup
  async function performVerification(targetId: string, targetRoll?: string, targetType?: string, targetMonth?: string) {
    setData(prev => ({ ...prev, status: 'loading', id: targetId }));

    try {
      const typeParam = (targetType || 'general').toLowerCase() as any;
      const cleanTargetId = targetId.trim();
      const cleanRoll = (targetRoll || '').trim();

      const candidateIds = Array.from(
        new Set([cleanTargetId, cleanRoll].filter(Boolean))
      );

      if (candidateIds.length === 0) {
        setData({
          type: typeParam,
          id: 'N/A',
          verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          status: 'error',
          errorMessage: 'Missing Document or Student ID in verification QR link.'
        });
        return;
      }

      // ========================================================
      // 1. CHECK STAFF TABLE (If type is staff_payroll or ID starts with STF)
      // ========================================================
      if (typeParam === 'staff_payroll' || candidateIds.some(c => c.toUpperCase().startsWith('STF'))) {
        for (const cand of candidateIds) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .or(`id.eq.${cand},cnic.eq.${cand},contact.eq.${cand}`)
            .limit(1);

          if (staffData && staffData.length > 0) {
            const st = staffData[0];
            setData({
              type: 'staff_payroll',
              id: cand,
              staff: {
                ...st,
                fullName: st.full_name,
                fatherName: st.father_name,
                joinDate: st.join_date,
                photo: st.photo_url || st.photo
              },
              month: targetMonth || '',
              verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
              status: 'verified'
            });
            return;
          }
        }
      }

      // ========================================================
      // 2. QUERY STUDENTS TABLE (With strictly valid Postgres columns)
      // ========================================================
      let studentRecord: any = null;
      let admissionRecord: any = null;

      for (const cand of candidateIds) {
        if (isUuid(cand)) {
          // If candidate is a UUID, query id or admission_id
          const { data: stdData, error: errUuid } = await supabase
            .from('students')
            .select('*')
            .or(`id.eq.${cand},admission_id.eq.${cand}`)
            .limit(1);

          if (!errUuid && stdData && stdData.length > 0) {
            studentRecord = stdData[0];
            break;
          }
        } else {
          // If candidate is text (e.g. SGC-26-679, 1001, etc.), query valid text columns
          const { data: stdData, error: errText } = await supabase
            .from('students')
            .select('*')
            .or(`id.eq.${cand},college_no.eq.${cand},bay_form_no.eq.${cand},board_roll_no.eq.${cand}`)
            .limit(1);

          if (!errText && stdData && stdData.length > 0) {
            studentRecord = stdData[0];
            break;
          }

          // Case-insensitive fallback
          const { data: stdIlike } = await supabase
            .from('students')
            .select('*')
            .ilike('id', cand)
            .limit(1);

          if (stdIlike && stdIlike.length > 0) {
            studentRecord = stdIlike[0];
            break;
          }
        }
      }

      // ========================================================
      // 3. QUERY ADMISSIONS TABLE (If not found or type is admission)
      // ========================================================
      if (!studentRecord || typeParam === 'admission') {
        for (const cand of candidateIds) {
          if (isUuid(cand)) {
            const { data: admData, error: errAdmUuid } = await supabase
              .from('admissions')
              .select('*')
              .eq('id', cand)
              .limit(1);

            if (!errAdmUuid && admData && admData.length > 0) {
              admissionRecord = admData[0];
              if (!studentRecord) studentRecord = admissionRecord;
              break;
            }
          } else {
            const { data: admData, error: errAdmText } = await supabase
              .from('admissions')
              .select('*')
              .or(`student_id.eq.${cand},college_no.eq.${cand},bay_form_no.eq.${cand},board_roll_no.eq.${cand}`)
              .limit(1);

            if (!errAdmText && admData && admData.length > 0) {
              admissionRecord = admData[0];
              if (!studentRecord) studentRecord = admissionRecord;
              break;
            }

            // Case-insensitive fallback on admissions
            const { data: admIlike } = await supabase
              .from('admissions')
              .select('*')
              .ilike('student_id', cand)
              .limit(1);

            if (admIlike && admIlike.length > 0) {
              admissionRecord = admIlike[0];
              if (!studentRecord) studentRecord = admissionRecord;
              break;
            }
          }
        }
      }

      // If student was found and has admission_id, join admission record for full profile details
      if (studentRecord && studentRecord.admission_id && !admissionRecord) {
        try {
          const { data: joinedAdm } = await supabase
            .from('admissions')
            .select('*')
            .eq('id', studentRecord.admission_id)
            .maybeSingle();

          if (joinedAdm) admissionRecord = joinedAdm;
        } catch (e) {
          console.warn('Admission join error:', e);
        }
      }

      // ========================================================
      // 4. FINALIZE RESULT
      // ========================================================
      if (studentRecord) {
        const normalized = normalizeStudentRecord(studentRecord, admissionRecord);
        setData({
          type: typeParam,
          id: cleanTargetId,
          student: normalized,
          admission: admissionRecord,
          verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          status: 'verified'
        });
      } else {
        setData({
          type: typeParam,
          id: cleanTargetId,
          verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          status: 'unverified',
          errorMessage: `No registered student or official college document found matching Reference ID: "${cleanTargetId}".`
        });
      }
    } catch (err: any) {
      console.error('Verification query error:', err);
      setData({
        type: 'general',
        id: targetId || 'Error',
        verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        status: 'error',
        errorMessage: 'Server verification check encountered an error. Please verify your internet connection.'
      });
    }
  }

  // Initial verification on page mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const typeParam = (searchParams.get('type') || searchParams.get('verify') || 'general').toLowerCase();
    const idParam = searchParams.get('id') || searchParams.get('studentId') || searchParams.get('student_id') || searchParams.get('roll') || searchParams.get('ref') || '';
    const rollParam = searchParams.get('roll') || searchParams.get('rollNo') || searchParams.get('collegeNo') || '';
    const monthParam = searchParams.get('m') || searchParams.get('month') || '';

    setSearchQuery(idParam || rollParam || '');
    performVerification(idParam || rollParam, rollParam, typeParam, monthParam);
  }, []);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    await performVerification(searchQuery.trim());
    setIsSearching(false);
  };

  const student = data.student;
  const staff = data.staff;
  const feeCalc = student ? calculateStudentFeeBreakdown(student) : null;

  const docTitle = 
    data.type === 'challan' ? 'Official 3-Copy Bank Challan' :
    data.type === 'receipt' ? 'Official College Fee Receipt' :
    data.type === 'admission' ? 'Official Admission Verification Slip' :
    data.type === 'card' ? 'Student Identity Verification' :
    data.type === 'staff_payroll' ? 'Faculty Monthly Payslip Voucher' :
    'Official Academic & Fee Ledger Record';

  const verificationRef = `VER-SGC-${new Date().getFullYear()}-${(data.id || '000').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppSupport = () => {
    const phone = '923014455891';
    const targetName = student?.fullName || staff?.fullName || data.id;
    const msg = encodeURIComponent(`Assalam o Alaikum, I am verifying document reference ${verificationRef} for ${targetName} (ID: ${data.id}). Kindly assist.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center justify-start p-3 sm:p-6 print:p-0 print:bg-white font-sans selection:bg-[#085a4e] selection:text-white">
      {/* Top Card Container */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden print:shadow-none print:border-none my-auto">
        
        {/* Superior College Header */}
        <div className="bg-gradient-to-r from-[#042e27] via-[#085a4e] to-[#042e27] text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#c9a84c]/15 blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center mb-3 shadow-xl text-[#c9a84c] p-3">
              <School size={36} className="text-[#c9a84c]" />
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 border border-white/20 text-[9px] font-black uppercase tracking-[0.25em] text-[#c9a84c] mb-1.5 shadow-xs">
              <Sparkles size={10} />
              <span>Official Online Verification System</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Superior Group of Colleges
            </h1>
            <p className="text-xs text-emerald-100 font-semibold mt-0.5 tracking-wide">
              Jahanian Main Campus • Academic & Accounts Registry
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6">
          
          {/* ==================================================== */}
          {/* STATE 1: LOADING */}
          {/* ==================================================== */}
          {data.status === 'loading' ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl border-4 border-[#085a4e]/20 border-t-[#085a4e] animate-spin flex items-center justify-center mx-auto" />
              <div>
                <h3 className="font-black text-slate-800 text-lg">Verifying Document Authenticity...</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Querying Superior College Jahanian central academic database
                </p>
              </div>
            </div>
          ) : data.status === 'unverified' || data.status === 'error' ? (
            /* ==================================================== */
            /* STATE 2: UNVERIFIED / NOT FOUND */
            /* ==================================================== */
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle size={32} />
              </div>

              <div className="space-y-1.5">
                <Badge className="bg-rose-100 text-rose-800 border-none font-black text-xs px-3 py-1 rounded-full">
                  UNVERIFIED RECORD
                </Badge>
                <h2 className="text-xl font-black text-slate-900">Document Verification Failed</h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  {data.errorMessage || 'No matching record was found in the central college database.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
                Scanned Reference ID: <span className="font-bold text-slate-900">{data.id || 'Unknown'}</span>
              </div>

              {/* Instant Manual Search / Re-verify bar */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Search size={13} />
                  <span>Search by Roll No, College No, or Student ID</span>
                </label>
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <Input 
                    placeholder="e.g. SGC-26-679, 1001, or Student ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white border-slate-200 text-xs h-10 rounded-xl"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="bg-[#085a4e] hover:bg-[#06483e] text-white font-black text-xs rounded-xl px-4 shrink-0"
                  >
                    {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Verify Now'}
                  </Button>
                </form>
                <p className="text-[10px] text-slate-500">
                  Admission receipt ya fee challan par likha hua Roll Number darj karein.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleWhatsAppSupport} className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 cursor-pointer">
                  <Phone size={14} className="mr-2" /> Contact College Helpdesk
                </Button>
                {onGoToAdmin && (
                  <Button variant="outline" onClick={onGoToAdmin} className="w-full sm:w-auto rounded-xl border-slate-200 font-bold text-xs h-10 px-5 cursor-pointer">
                    <ArrowLeft size={14} className="mr-2" /> Admin Portal
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* ==================================================== */
            /* STATE 3: VERIFIED SUCCESS */
            /* ==================================================== */
            <>
              {/* Verification Success Ribbon */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#085a4e] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#085a4e] block">
                      Security Status
                    </span>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                      <span>100% VERIFIED & AUTHENTIC</span>
                      <CheckCircle2 size={16} className="text-emerald-600 inline" />
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">Certificate #</span>
                  <span className="font-mono font-black text-xs text-slate-800">{verificationRef}</span>
                </div>
              </div>

              {/* Document Overview Banner */}
              <div className="border-b border-slate-100 pb-4 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Type</span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">{docTitle}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-medium">
                  <Clock size={13} className="text-slate-400" />
                  <span>Verified live from central database on: <strong className="text-slate-700">{data.verifiedAt}</strong></span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* IF STUDENT RECORD */}
              {/* ======================================================== */}
              {student && (
                <>
                  {/* Student & Academic Particulars Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 text-left">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                        <User size={14} className="text-[#085a4e]" />
                        <span>Enrolled Student Credentials</span>
                      </div>
                      <Badge className="bg-[#085a4e] text-white border-none font-bold text-[10px] px-2 py-0.5">
                        Active Scholar
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Student Full Name:</span>
                        <span className="font-black text-slate-900 text-sm">
                          {student.fullName}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Father Name:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {student.fatherName}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Roll No / Student ID:</span>
                        <span className="font-mono font-black text-emerald-800 text-sm">
                          {student.rollNo || student.id}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Class & Group:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {student.group || student.category} {student.section ? `(Section ${student.section})` : ''}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Campus:</span>
                        <span className="font-bold text-slate-700">
                          Superior College Jahanian ({student.gender || 'Male'})
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Academic Session:</span>
                        <span className="font-bold text-slate-700">
                          {student.session || '2026-28'} • {student.academicPart || 'Part-1'}
                        </span>
                      </div>

                      {student.contact && (
                        <div>
                          <span className="text-slate-400 font-semibold block text-[11px]">Registered Contact:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {student.contact}
                          </span>
                        </div>
                      )}

                      {student.bayFormNo && (
                        <div>
                          <span className="text-slate-400 font-semibold block text-[11px]">B-Form / CNIC:</span>
                          <span className="font-mono font-bold text-slate-700">
                            {student.bayFormNo}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial & Fee Clearance Summary */}
                  {feeCalc && (
                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
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
                          <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                            Rs. {(feeCalc.totalPackage || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/60">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Paid So Far</span>
                          <span className="font-mono font-black text-emerald-800 text-xs sm:text-sm">
                            Rs. {(feeCalc.feeReceived || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-rose-50/60">
                          <span className="text-[10px] font-bold text-rose-700 uppercase block">Current Due</span>
                          <span className="font-mono font-black text-rose-700 text-xs sm:text-sm">
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
                </>
              )}

              {/* ======================================================== */}
              {/* IF STAFF RECORD */}
              {/* ======================================================== */}
              {staff && (
                <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-3 text-left">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                      <Briefcase size={14} className="text-[#085a4e]" />
                      <span>Faculty Member Profile</span>
                    </div>
                    <Badge className="bg-[#085a4e] text-white border-none font-bold text-[10px]">
                      Verified Faculty
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Faculty Member Name:</span>
                      <span className="font-black text-slate-900 text-sm">
                        {staff.fullName}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Designation / Role:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {staff.role || 'Professor'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Staff ID:</span>
                      <span className="font-mono font-black text-emerald-800 text-sm">
                        {staff.id}
                      </span>
                    </div>

                    {data.month && (
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Payslip Month:</span>
                        <span className="font-bold text-slate-800 text-sm">
                          {data.month}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Campus:</span>
                      <span className="font-bold text-slate-700">
                        Superior College Jahanian
                      </span>
                    </div>

                    {staff.contact && (
                      <div>
                        <span className="text-slate-400 font-semibold block text-[11px]">Contact:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {staff.contact}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legal & Security Tamper Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 leading-relaxed text-left">
                <strong>🛡️ Official Anti-Forgery Notice:</strong> This digital verification certificate is generated in real-time by querying the official server of Superior Group of Colleges Jahanian. Any alteration, manual modification, or unauthorized forgery on printed slips is strictly prohibited and legally actionable.
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
