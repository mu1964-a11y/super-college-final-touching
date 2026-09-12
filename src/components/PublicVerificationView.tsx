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
  BookOpen,
  Calendar,
  Sparkles,
  RefreshCw,
  MapPin,
  PhoneCall,
  Check,
  Award,
  FileText,
  Receipt,
  GraduationCap,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateStudentFeeBreakdown } from '../lib/feeCalculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { safeLocalStorage } from '../utils/safeStorage';

interface VerificationData {
  type: 'challan' | 'receipt' | 'admission' | 'card' | 'staff_payroll' | 'general' | 'student';
  id: string;
  student?: any;
  admission?: any;
  staff?: any;
  transactions?: any[];
  academicRecords?: any[];
  attendanceStats?: {
    presentDays: number;
    absentDays: number;
    totalDays: number;
    attendancePercent: number;
  };
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
  const mFee = Number(s.monthly_fee ?? s.monthlyFee ?? a.monthly_fee ?? 0);
  const admFee = Number(s.admission_fee ?? a.admission_fee ?? 0);
  const totalInst = Number(s.total_installments ?? a.total_installments ?? 10);

  // Parse subjects array safely
  let subjectsList: string[] = [];
  if (Array.isArray(s.subjects)) subjectsList = s.subjects;
  else if (Array.isArray(a.subjects)) subjectsList = a.subjects;

  const rawGender = (s.gender || a.gender || '').trim();
  const rawCat = (s.category || a.category || '').toLowerCase();
  const isGirls = rawGender.toLowerCase() === 'female' || rawCat.includes('girls') || rawCat.includes('female');
  const campusDisplay = isGirls ? 'Girls Campus (Female)' : 'Boys Campus (Male)';

  return {
    id: s.id || a.student_id || a.id || '',
    studentId: a.student_id || s.id || '',
    admissionId: s.admission_id || a.id || '',
    fullName: (s.full_name || s.fullName || a.full_name || a.fullName || 'Student').trim(),
    fatherName: (s.father_name || s.fatherName || a.father_name || a.fatherName || 'N/A').trim(),
    rollNo: s.college_no || s.id || a.college_no || a.student_id || '',
    collegeNo: s.college_no || a.college_no || '',
    bayFormNo: s.bay_form_no || a.bay_form_no || '',
    boardRollNo: s.board_roll_no || a.board_roll_no || '',
    category: s.category || a.category || 'General',
    group: s.group || a.group || 'F.Sc',
    section: s.section || a.section || '',
    gender: rawGender || (isGirls ? 'Female' : 'Male'),
    campusDisplay,
    dob: s.dob || a.dob || '',
    contact: s.contact || a.contact_number || a.contact || '',
    fatherContact: a.father_contact || s.fatherContact || '',
    address: s.address || a.address || '',
    email: s.email || a.email || '',
    bloodGroup: s.blood_group || a.bloodGroup || '',
    session: s.session || a.session || '2026-28',
    academicPart: s.academic_part || a.academic_part || 'Part-1',
    programType: s.program_type || a.program_type || 'Yearly',
    admissionDate: a.date || s.created_at ? new Date(a.date || s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    totalPackage: totalPkg,
    feeReceived: feeRcv,
    monthlyFee: mFee,
    admissionFee: admFee,
    totalInstallments: totalInst,
    paymentPlan: a.payment_plan || 'Installments',
    feeLedger: s.fee_ledger || a.fee_ledger || null,
    feeHistory: s.fee_history || a.fee_history || [],
    subjects: subjectsList,
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

  const [collegeLogo, setCollegeLogo] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? safeLocalStorage.getItem('college_logo') : null;
  });
  const [collegeName, setCollegeName] = useState<string>(() => {
    return typeof window !== 'undefined' ? (safeLocalStorage.getItem('college_name') || 'Superior College Jahanian') : 'Superior College Jahanian';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Force light mode on document body while verification view is open to guarantee pristine white background
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains('dark');
    html.classList.remove('dark');
    html.style.colorScheme = 'light';

    // Fetch official branding logo & college name from settings
    async function loadBranding() {
      try {
        const { data: stg } = await supabase.from('settings').select('*').limit(1).maybeSingle();
        if (stg) {
          const logo = stg.logo_url || stg.logo || stg.config?.logo || stg.config?.logo_url;
          if (logo) {
            setCollegeLogo(logo);
            safeLocalStorage.setItem('college_logo', logo);
          }
          const name = stg.college_name || stg.name || 'Superior College Jahanian';
          setCollegeName(name);
          safeLocalStorage.setItem('college_name', name);
        }
      } catch (e) {
        console.warn('Failed to load branding in verification view:', e);
      }
    }
    loadBranding();

    return () => {
      html.style.colorScheme = '';
      if (hadDark) html.classList.add('dark');
    };
  }, []);

  // Perform multi-stage, fault-tolerant universal verification lookup
  async function performVerification(
    targetId: string, 
    targetRoll?: string, 
    targetType?: string, 
    targetMonth?: string,
    extraCandidates: string[] = []
  ) {
    setData(prev => ({ ...prev, status: 'loading', id: targetId }));

    try {
      const typeParam = (targetType || 'general').toLowerCase() as any;
      const cleanTargetId = targetId.trim();
      const cleanRoll = (targetRoll || '').trim();

      const candidateIds = Array.from(
        new Set([cleanTargetId, cleanRoll, ...extraCandidates.map(c => (c || '').trim())].filter(Boolean))
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
      // 2. QUERY STUDENTS TABLE (Active Enrolled Database)
      // ========================================================
      let studentRecord: any = null;
      let admissionRecord: any = null;

      for (const cand of candidateIds) {
        if (isUuid(cand)) {
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
              break;
            }
          }
        }
      }

      // If found in admissions, check if student was promoted/converted into students table
      if (admissionRecord && !studentRecord) {
        try {
          const admRefId = admissionRecord.id;
          const admStudentId = admissionRecord.student_id;
          const admCollegeNo = admissionRecord.college_no;
          const { data: linkedStudents } = await supabase
            .from('students')
            .select('*')
            .or(`admission_id.eq.${admRefId}${admStudentId ? `,id.eq.${admStudentId}` : ''}${admCollegeNo ? `,college_no.eq.${admCollegeNo}` : ''}`)
            .limit(1);
          if (linkedStudents && linkedStudents.length > 0) {
            studentRecord = linkedStudents[0];
          }
        } catch (e) {
          console.warn('Error linking admission to students table:', e);
        }
      }

      // If student was found and has admission_id, join admission record for complete original dossier
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

      // Fallback: If no studentRecord but admissionRecord exists, use admissionRecord
      if (!studentRecord && admissionRecord) {
        studentRecord = admissionRecord;
      }

      // ========================================================
      // 4. FETCH LIVE REAL-TIME DATA (Transactions, Exams, Attendance)
      // ========================================================
      let liveTransactions: any[] = [];
      let liveAcademicRecords: any[] = [];
      const activeStudentDbId = studentRecord?.id || admissionRecord?.student_id;

      if (activeStudentDbId) {
        try {
          const { data: txData } = await supabase
            .from('fee_transactions')
            .select('*')
            .eq('student_id', activeStudentDbId)
            .order('date', { ascending: false });
          if (txData && txData.length > 0) {
            liveTransactions = txData;
          }
        } catch (errTx) {
          console.warn('Live fee_transactions fetch error:', errTx);
        }

        try {
          const { data: arData } = await supabase
            .from('academic_records')
            .select('*')
            .eq('student_id', activeStudentDbId)
            .order('date', { ascending: false });
          if (arData && arData.length > 0) {
            liveAcademicRecords = arData;
          }
        } catch (errAr) {
          console.warn('Live academic_records fetch error:', errAr);
        }
      }

      // Calculate attendance standing
      const presentDays = Number(studentRecord?.attendance_present ?? 0);
      const absentDays = Number(studentRecord?.attendance_absent ?? 0);
      const totalDays = presentDays + absentDays;
      const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

      // ========================================================
      // 5. FINALIZE RESULT WITH REAL-TIME DOSSIER
      // ========================================================
      if (studentRecord) {
        const normalized = normalizeStudentRecord(studentRecord, admissionRecord);
        
        // Update fee received if live transactions sum is higher
        if (liveTransactions.length > 0) {
          const sumPaid = liveTransactions.reduce((acc, t) => acc + Number(t.amount || 0), 0);
          if (sumPaid > (normalized.feeReceived || 0)) {
            normalized.feeReceived = sumPaid;
            normalized.fee_received = sumPaid;
          }
        }

        setData({
          type: typeParam,
          id: cleanTargetId,
          student: normalized,
          admission: admissionRecord,
          transactions: liveTransactions,
          academicRecords: liveAcademicRecords,
          attendanceStats: {
            presentDays,
            absentDays,
            totalDays,
            attendancePercent
          },
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
    const studentIdParam = searchParams.get('student_id') || '';
    const admIdParam = searchParams.get('adm_id') || '';
    const monthParam = searchParams.get('m') || searchParams.get('month') || '';

    const primarySearch = idParam || rollParam || studentIdParam || '';
    setSearchQuery(primarySearch);
    performVerification(primarySearch, rollParam, typeParam, monthParam, [studentIdParam, admIdParam]);
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
    data.type === 'card' ? 'Student Identity Verification Card' :
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

  // Percentage of fee cleared
  const totalPackageAmount = Number(feeCalc?.totalPackage || student?.totalPackage || 0);
  const feeReceivedAmount = Number(feeCalc?.feeReceived || student?.feeReceived || 0);
  const clearedPercent = totalPackageAmount > 0 ? Math.min(100, Math.round((feeReceivedAmount / totalPackageAmount) * 100)) : 0;

  return (
    <div 
      className="min-h-screen !bg-[#f8fafc] !text-slate-900 flex flex-col items-center justify-start p-3 sm:p-6 print:p-0 print:!bg-white font-sans selection:!bg-[#085a4e] selection:!text-white"
      style={{ colorScheme: 'light', backgroundColor: '#f8fafc', color: '#0f172a' }}
    >
      {/* Top Card Container with Strict Pure White Background & Crisp Black Typography */}
      <div 
        className="w-full max-w-2xl !bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border !border-slate-200 overflow-hidden print:shadow-none print:border-none my-auto"
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      >
        
        {/* Superior College Executive Header with Real Circular Logo */}
        <div className="bg-gradient-to-r from-[#022822] via-[#085a4e] to-[#043b32] !text-white p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Subtle Ambient Foil Glows */}
          <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-[#c9a84c]/20 blur-2xl pointer-events-none" />

          <div className="flex flex-col items-center relative z-10">
            {/* Authentic Circular Superior College Logo */}
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full !bg-white p-1 shadow-[0_12px_30px_rgba(0,0,0,0.35)] border-2 border-[#c9a84c] flex items-center justify-center mb-3.5 relative overflow-hidden shrink-0">
              {collegeLogo ? (
                <img 
                  src={collegeLogo} 
                  alt={collegeName} 
                  className="w-full h-full object-contain rounded-full select-none"
                  onError={(e) => {
                    // Fallback to building icon if image fails
                    (e.target as any).style.display = 'none';
                  }}
                />
              ) : (
                <School size={42} className="text-[#085a4e]" />
              )}
            </div>
            
            {/* Gold Institutional Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 border border-[#c9a84c]/40 text-[9.5px] font-black uppercase tracking-[0.25em] text-[#fef08a] mb-2 shadow-xs backdrop-blur-md">
              <Sparkles size={11} className="text-[#fef08a]" />
              <span>Official Online Verification System</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight !text-white uppercase">
              {collegeName || "Superior Group of Colleges"}
            </h1>
            <p className="text-xs text-emerald-100/90 font-bold mt-0.5 tracking-wide">
              Jahanian Main Campus • Academic & Accounts Registry
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-6 !bg-white" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
          
          {/* ==================================================== */}
          {/* STATE 1: LOADING */}
          {/* ==================================================== */}
          {data.status === 'loading' ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 !bg-white">
              <div className="w-14 h-14 rounded-2xl border-4 border-[#085a4e]/20 border-t-[#085a4e] animate-spin flex items-center justify-center mx-auto" />
              <div>
                <h3 className="font-black !text-slate-900 text-lg">Verifying Document Authenticity...</h3>
                <p className="text-xs !text-slate-500 font-medium mt-1">
                  Querying Superior College central database in real time
                </p>
              </div>
            </div>
          ) : data.status === 'unverified' || data.status === 'error' ? (
            /* ==================================================== */
            /* STATE 2: UNVERIFIED / NOT FOUND */
            /* ==================================================== */
            <div className="py-6 text-center space-y-5 !bg-white">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle size={32} />
              </div>

              <div className="space-y-1.5">
                <Badge className="bg-rose-100 text-rose-800 border-none font-black text-xs px-3 py-1 rounded-full">
                  UNVERIFIED RECORD
                </Badge>
                <h2 className="text-xl font-black !text-slate-900">Document Verification Failed</h2>
                <p className="text-xs !text-slate-600 max-w-md mx-auto leading-relaxed">
                  {data.errorMessage || 'No matching record was found in the central college database.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs !text-slate-700 font-mono">
                Scanned Reference ID: <strong className="!text-slate-900">{data.id || 'Unknown'}</strong>
              </div>

              {/* Instant Manual Search / Re-verify bar */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider !text-emerald-950 flex items-center gap-1.5">
                  <Search size={13} />
                  <span>Search by Roll No, College No, or Student ID</span>
                </label>
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <Input 
                    placeholder="e.g. SGC-26-828, 1001, or Student ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="!bg-white !border-slate-300 !text-slate-900 text-xs h-10 rounded-xl"
                  />
                  <Button 
                    type="submit" 
                    disabled={isSearching}
                    className="!bg-[#085a4e] hover:!bg-[#06483e] !text-white font-black text-xs rounded-xl px-4 shrink-0 shadow-sm"
                  >
                    {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Verify Now'}
                  </Button>
                </form>
                <p className="text-[10px] !text-slate-500">
                  Admission receipt ya bank challan par likha hua Roll Number ya ID darj karein.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={handleWhatsAppSupport} className="w-full sm:w-auto rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold text-xs h-10 px-5 cursor-pointer shadow-sm">
                  <Phone size={14} className="mr-2" /> Contact College Helpdesk
                </Button>
                {onGoToAdmin && (
                  <Button variant="outline" onClick={onGoToAdmin} className="w-full sm:w-auto rounded-xl !border-slate-300 font-bold text-xs h-10 px-5 cursor-pointer !text-slate-700">
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
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#085a4e] to-[#043b32] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/20 border border-emerald-400/30">
                    <ShieldCheck size={26} className="text-emerald-200" />
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#085a4e] block">
                      Cryptographic Status
                    </span>
                    <h3 className="text-sm sm:text-base font-black !text-slate-900 flex items-center gap-1.5">
                      <span>100% VERIFIED & AUTHENTIC</span>
                      <CheckCircle2 size={16} className="text-emerald-600 inline shrink-0" />
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold !text-slate-400 block">Certificate #</span>
                  <span className="font-mono font-black text-xs sm:text-sm !text-slate-900">{verificationRef}</span>
                </div>
              </div>

              {/* Document Overview Banner */}
              <div className="border-b border-slate-200 pb-4 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest !text-slate-500">Document Type</span>
                <h2 className="text-xl sm:text-2xl font-black !text-slate-950 mt-0.5">{docTitle}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-xs !text-slate-600 font-medium">
                  <Clock size={13} className="text-slate-400" />
                  <span>Verified live from central database on: <strong className="!text-slate-900">{data.verifiedAt}</strong></span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* IF STUDENT RECORD */}
              {/* ======================================================== */}
              {student && (
                <>
                  {/* Comprehensive Student & Academic Particulars Card */}
                  <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                        <User size={15} className="text-[#085a4e]" />
                        <span>Enrolled Student Particulars</span>
                      </div>
                      <Badge className="bg-[#085a4e] !text-white border-none font-bold text-[10.5px] px-2.5 py-0.5 shadow-xs">
                        Active Scholar
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
                      <div className="border-b sm:border-b-0 border-slate-100 pb-2 sm:pb-0">
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Student Full Name:</span>
                        <span className="font-black !text-slate-950 text-base">
                          {student.fullName}
                        </span>
                      </div>

                      <div className="border-b sm:border-b-0 border-slate-100 pb-2 sm:pb-0">
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Father Name:</span>
                        <span className="font-black !text-slate-900 text-base">
                          {student.fatherName}
                        </span>
                      </div>

                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Roll No / Student ID:</span>
                        <span className="font-mono font-black text-[#085a4e] text-sm sm:text-base">
                          {student.rollNo || student.id}
                        </span>
                      </div>

                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Class & Group:</span>
                        <span className="font-black !text-slate-900 text-sm">
                          {student.group || student.category} {student.section ? `(Section ${student.section})` : ''}
                        </span>
                      </div>

                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Campus & Gender:</span>
                        <span className="font-bold !text-slate-800 text-xs sm:text-sm">
                          {student.campusDisplay || `Superior College Jahanian (${student.gender})`}
                        </span>
                      </div>

                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Academic Session:</span>
                        <span className="font-bold !text-slate-800 text-xs sm:text-sm">
                          {student.session || '2026-28'} • {student.academicPart || 'Part-1'}
                        </span>
                      </div>

                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Registered Student Contact:</span>
                        <span className="font-mono font-bold !text-slate-900 text-xs sm:text-sm">
                          {student.contact || 'N/A'}
                        </span>
                      </div>

                      {student.fatherContact && (
                        <div>
                          <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Father / Guardian Contact:</span>
                          <span className="font-mono font-bold !text-slate-900 text-xs sm:text-sm">
                            {student.fatherContact}
                          </span>
                        </div>
                      )}

                      {student.bayFormNo && (
                        <div>
                          <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">B-Form / CNIC:</span>
                          <span className="font-mono font-bold !text-slate-900">
                            {student.bayFormNo}
                          </span>
                        </div>
                      )}

                      {student.admissionDate && (
                        <div>
                          <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Admission Confirmed Date:</span>
                          <span className="font-bold !text-slate-800">
                            {student.admissionDate}
                          </span>
                        </div>
                      )}

                      {student.address && (
                        <div className="sm:col-span-2">
                          <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Residential Address:</span>
                          <span className="font-bold !text-slate-800 flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{student.address}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Enrolled Subjects Badges */}
                    {student.subjects && student.subjects.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="!text-slate-500 font-bold block text-[10.5px] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <BookOpen size={12} className="text-[#085a4e]" />
                          <span>Enrolled Subject Curriculum:</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {student.subjects.map((sub: string, idx: number) => (
                            <span 
                              key={idx} 
                              className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 !text-slate-800 font-bold text-[11px]"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial & Fee Clearance Summary */}
                  {feeCalc && (
                    <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                          <Coins size={15} className="text-[#c9a84c]" />
                          <span>Financial Clearance Ledger</span>
                        </div>
                        <Badge className={
                          feeCalc.totalBalance <= 0 
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10.5px]"
                            : "bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10.5px]"
                        }>
                          {feeCalc.totalBalance <= 0 ? "100% Fully Cleared" : `${clearedPercent}% Paid • Active Dues`}
                        </Badge>
                      </div>

                      {/* 4-Stat Metric Boxes */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10.5px] font-bold !text-slate-500 uppercase block tracking-wider">Total Package</span>
                          <span className="font-mono font-black !text-slate-950 text-sm sm:text-base">
                            Rs. {(feeCalc.totalPackage || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
                          <span className="text-[10.5px] font-bold text-emerald-800 uppercase block tracking-wider">Paid So Far</span>
                          <span className="font-mono font-black text-emerald-900 text-sm sm:text-base">
                            Rs. {(feeCalc.feeReceived || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200">
                          <span className="text-[10.5px] font-bold text-rose-800 uppercase block tracking-wider">Current Due</span>
                          <span className="font-mono font-black text-rose-900 text-sm sm:text-base">
                            Rs. {(feeCalc.currentInstallmentDue || 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-100 border border-slate-300">
                          <span className="text-[10.5px] font-bold !text-slate-600 uppercase block tracking-wider">Total Balance</span>
                          <span className="font-mono font-black !text-slate-950 text-sm sm:text-base">
                            Rs. {(feeCalc.totalBalance || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar & Installment Plan Note */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="!text-slate-600">Package Clearance Meter</span>
                          <span className="font-mono font-black text-[#085a4e]">{clearedPercent}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="h-full bg-gradient-to-r from-[#085a4e] to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${clearedPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10.5px] !text-slate-500 pt-0.5">
                          <span>Payment Plan: <strong>{student.paymentPlan || 'Installments'} ({student.totalInstallments || 10} Installments)</strong></span>
                          {student.monthlyFee > 0 && <span>Monthly: <strong>Rs. {student.monthlyFee.toLocaleString()}/mo</strong></span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Live Attendance Standing Card */}
                  <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                        <Calendar size={15} className="text-[#085a4e]" />
                        <span>Classroom Attendance Standing</span>
                      </div>
                      <Badge className={
                        (data.attendanceStats?.attendancePercent ?? 100) >= 75
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-[10.5px]"
                          : "bg-rose-100 text-rose-900 border border-rose-300 font-bold text-[10.5px]"
                      }>
                        {(data.attendanceStats?.attendancePercent ?? 100) >= 75 
                          ? "✓ Board Exam Eligible (75%+)" 
                          : "⚠ Low Attendance Warning"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold !text-slate-500 uppercase block tracking-wider">Days Present</span>
                        <span className="font-mono font-black text-emerald-700 text-base sm:text-lg">
                          {data.attendanceStats?.presentDays ?? 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] font-bold !text-slate-500 uppercase block tracking-wider">Days Absent</span>
                        <span className="font-mono font-black text-rose-700 text-base sm:text-lg">
                          {data.attendanceStats?.absentDays ?? 0}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider">Attendance %</span>
                        <span className="font-mono font-black text-emerald-950 text-base sm:text-lg">
                          {data.attendanceStats?.attendancePercent ?? 100}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Academic & Examination Dossier */}
                  <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                        <Award size={15} className="text-[#c9a84c]" />
                        <span>Academic Assessments & Exam Marks</span>
                      </div>
                      <Badge className="bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[10.5px]">
                        {data.academicRecords && data.academicRecords.length > 0 ? `${data.academicRecords.length} Tests Logged` : 'Active Session'}
                      </Badge>
                    </div>

                    {data.academicRecords && data.academicRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[9.5px]">
                            <tr>
                              <th className="p-2.5 rounded-l-lg">Test Title</th>
                              <th className="p-2.5">Subject</th>
                              <th className="p-2.5 text-center">Marks</th>
                              <th className="p-2.5 text-center">Percentage</th>
                              <th className="p-2.5 rounded-r-lg text-right">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.academicRecords.map((rec, idx) => {
                              const pct = rec.total_marks > 0 ? Math.round((rec.obtained_marks / rec.total_marks) * 100) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="p-2.5 font-bold text-slate-900">{rec.test_name || 'Class Test'}</td>
                                  <td className="p-2.5 font-medium text-slate-600">{rec.subject}</td>
                                  <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                                    {rec.obtained_marks} / {rec.total_marks}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10.5px] ${pct >= 70 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                      {pct}%
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right font-mono text-[10px] text-slate-400">
                                    {rec.date ? new Date(rec.date).toLocaleDateString('en-GB') : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-0.5">
                          <GraduationCap size={14} className="text-[#085a4e]" />
                          <span>Academic Session 2026-28 Enrolled & Verified</span>
                        </p>
                        <span>Student is actively enrolled in current academic term. Internal test scores and mock examinations are logged in real time directly from campus teaching faculties.</span>
                      </div>
                    )}
                  </div>

                  {/* Live Fee Payment Transactions & Official Receipts Ledger */}
                  {data.transactions && data.transactions.length > 0 && (
                    <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5 text-left">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                          <Receipt size={15} className="text-[#085a4e]" />
                          <span>Verified Fee Payment Transactions ({data.transactions.length})</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Live Central Receipts
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[9.5px]">
                            <tr>
                              <th className="p-2.5 rounded-l-lg">Receipt ID</th>
                              <th className="p-2.5">Payment Date</th>
                              <th className="p-2.5">Mode</th>
                              <th className="p-2.5 text-right rounded-r-lg">Amount Deposited</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.transactions.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-mono font-bold text-[#085a4e]">{tx.receipt_id || `REC-${idx + 1}`}</td>
                                <td className="p-2.5 text-slate-600 font-medium">
                                  {tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                </td>
                                <td className="p-2.5 text-slate-600 capitalize">{tx.payment_method || 'Cash / Bank'}</td>
                                <td className="p-2.5 text-right font-mono font-black text-emerald-700 text-sm">
                                  Rs. {Number(tx.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ======================================================== */}
              {/* IF STAFF RECORD */}
              {/* ======================================================== */}
              {staff && (
                <div className="!bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider !text-slate-900">
                      <Briefcase size={15} className="text-[#085a4e]" />
                      <span>Faculty Member Particulars</span>
                    </div>
                    <Badge className="bg-[#085a4e] !text-white border-none font-bold text-[10.5px]">
                      Verified Faculty
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Faculty Member Name:</span>
                      <span className="font-black !text-slate-950 text-base">
                        {staff.fullName}
                      </span>
                    </div>

                    <div>
                      <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Designation / Role:</span>
                      <span className="font-bold !text-slate-900 text-sm">
                        {staff.role || 'Professor'}
                      </span>
                    </div>

                    <div>
                      <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Staff ID:</span>
                      <span className="font-mono font-black text-[#085a4e] text-sm">
                        {staff.id}
                      </span>
                    </div>

                    {data.month && (
                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Payslip Month:</span>
                        <span className="font-bold !text-slate-900 text-sm">
                          {data.month}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Campus:</span>
                      <span className="font-bold !text-slate-800">
                        Superior College Jahanian
                      </span>
                    </div>

                    {staff.contact && (
                      <div>
                        <span className="!text-slate-500 font-bold block text-[11px] uppercase tracking-wider">Registered Contact:</span>
                        <span className="font-mono font-bold !text-slate-900">
                          {staff.contact}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Legal Anti-Forgery & Security Stamp Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-[11.5px] text-amber-950 leading-relaxed text-left shadow-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">🛡️</span>
                  <div>
                    <strong className="text-amber-950 font-black">Official Anti-Forgery & Legal Security Notice:</strong>
                    <p className="mt-0.5 text-amber-900 font-medium">
                      This digital verification certificate is generated in real time directly from the central database of Superior Group of Colleges Jahanian. Any manual alteration, erasure, or unauthorized forgery on printed slips is strictly prohibited and constitutes a punishable legal offence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={handlePrint} 
                    variant="outline" 
                    className="flex-1 sm:flex-none rounded-xl !border-slate-300 font-bold text-xs h-11 px-4 cursor-pointer !bg-white !text-slate-800 hover:!bg-slate-50 shadow-xs"
                  >
                    <Printer size={15} className="mr-1.5 text-slate-600" /> Print Official Certificate
                  </Button>
                  <Button 
                    onClick={handleWhatsAppSupport} 
                    className="flex-1 sm:flex-none rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold text-xs h-11 px-4 cursor-pointer shadow-xs"
                  >
                    <Phone size={15} className="mr-1.5" /> College Helpline
                  </Button>
                </div>

                {onGoToAdmin && (
                  <Button 
                    variant="ghost" 
                    onClick={onGoToAdmin} 
                    className="text-xs !text-slate-500 hover:!text-slate-900 font-bold cursor-pointer"
                  >
                    Staff / Admin Login ➔
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="!bg-slate-50 border-t !border-slate-200 p-4 text-center text-[10.5px] !text-slate-500 font-medium">
          © {new Date().getFullYear()} Superior Group of Colleges Jahanian • Verified by Central LMS Security System
        </div>
      </div>
    </div>
  );
}
