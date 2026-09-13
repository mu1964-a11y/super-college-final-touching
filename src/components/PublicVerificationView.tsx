import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
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
  Award,
  FileText,
  Receipt,
  GraduationCap,
  Download,
  FileDown,
  Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateStudentFeeBreakdown } from '../lib/feeCalculations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { safeLocalStorage } from '../utils/safeStorage';
import { exportElementToImage, exportElementToPdf } from '../utils/documentExporter';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface VerificationData {
  type: 'challan' | 'receipt' | 'statement' | 'admission' | 'result' | 'attendance' | 'card' | 'staff_payroll' | 'general' | 'student';
  id: string;
  receiptNo?: string;
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

// Convert numbers into currency words (Pakistani currency notation: Thousand, Lakh, Crore)
function convertNumberToWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  const res = inWords(Math.round(num)).trim();
  return `Rupees ${res} Only`;
}

// Deterministic computerized barcode component
function BarcodeSvg({ value }: { value: string }) {
  const bars = Array.from(value || 'SGC-VERIFIED').map((char, i) => {
    const code = char.charCodeAt(0);
    const width = (code % 3) + 1.2;
    const isGap = i % 4 === 3;
    return { width, isGap };
  });

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex items-center h-7 gap-[1.5px] px-1 bg-white">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={`h-full ${bar.isGap ? 'bg-transparent w-[1px]' : 'bg-[#000000]'}`}
            style={{ width: `${bar.width}px` }}
          />
        ))}
      </div>
      <span className="font-mono text-[8.5px] font-black tracking-widest text-[#000000] mt-0.5 select-none">
        *{value}*
      </span>
    </div>
  );
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
    total_package: totalPkg,
    fee_received: feeRcv,
    full_name: s.full_name || a.full_name,
    father_name: s.father_name || a.father_name,
  };
}

export default function PublicVerificationView({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const documentRef = useRef<HTMLDivElement>(null);
  
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
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Force light mode on document root while verification view is active
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

  // Generate live scannable QR Code for the exact current URL
  useEffect(() => {
    if (typeof window !== 'undefined' && data.status === 'verified') {
      QRCode.toDataURL(window.location.href, {
        margin: 1,
        width: 140,
        color: {
          dark: '#085a4e',
          light: '#ffffff'
        }
      }).then(url => setQrCodeDataUrl(url)).catch(() => {});
    }
  }, [data.id, data.type, data.receiptNo, data.status]);

  // Universal verification query
  async function performVerification(
    targetId: string, 
    targetRoll?: string, 
    targetType?: string, 
    targetMonth?: string,
    targetReceiptNo?: string,
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
          errorMessage: 'Missing Document or Student ID in verification link.'
        });
        return;
      }

      // 1. Staff Lookup
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

      // 2. Students Table Lookup
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

      // 3. Admissions Table Lookup
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

      // Link admission to enrolled student if applicable
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

      if (!studentRecord && admissionRecord) {
        studentRecord = admissionRecord;
      }

      // 4. Live Transactions & Academic Records
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

      // Attendance statistics
      const presentDays = Number(studentRecord?.attendance_present ?? 0);
      const absentDays = Number(studentRecord?.attendance_absent ?? 0);
      const totalDays = presentDays + absentDays;
      const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

      // 5. Build Final Dossier
      if (studentRecord) {
        const normalized = normalizeStudentRecord(studentRecord, admissionRecord);
        
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
          receiptNo: targetReceiptNo,
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
          month: targetMonth || '',
          verifiedAt: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
          status: 'verified'
        });
      } else {
        setData({
          type: typeParam,
          id: cleanTargetId,
          receiptNo: targetReceiptNo,
          month: targetMonth || '',
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

  // Initial verification on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const typeParam = (searchParams.get('v') || searchParams.get('type') || searchParams.get('verify') || searchParams.get('doc') || 'general').toLowerCase();
    const idParam = searchParams.get('id') || searchParams.get('studentId') || searchParams.get('student_id') || searchParams.get('roll') || searchParams.get('ref') || '';
    const rollParam = searchParams.get('roll') || searchParams.get('rollNo') || searchParams.get('collegeNo') || '';
    const studentIdParam = searchParams.get('student_id') || '';
    const admIdParam = searchParams.get('adm_id') || '';
    const monthParam = searchParams.get('m') || searchParams.get('month') || '';
    const rcpParam = searchParams.get('rcp') || searchParams.get('receipt') || searchParams.get('receipt_id') || '';

    const primarySearch = idParam || rollParam || studentIdParam || '';
    setSearchQuery(primarySearch);
    performVerification(primarySearch, rollParam, typeParam, monthParam, rcpParam, [studentIdParam, admIdParam]);
  }, []);

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    await performVerification(searchQuery.trim(), '', data.type, data.month, data.receiptNo);
    setIsSearching(false);
  };

  const student = data.student;
  const staff = data.staff;
  const feeCalc = student ? calculateStudentFeeBreakdown(student) : null;

  const docTitle = 
    data.type === 'receipt' ? 'OFFICIAL COMPUTERIZED FEE PAYMENT RECEIPT' :
    data.type === 'statement' || data.type === 'challan' ? 'OFFICIAL STUDENT FEE ACCOUNT STATEMENT & LEDGER' :
    data.type === 'admission' ? 'OFFICIAL ADMISSION CONFIRMATION SLIP & ENROLMENT FORM' :
    data.type === 'result' ? 'OFFICIAL ACADEMIC EXAMINATION ASSESSMENT REPORT' :
    data.type === 'attendance' ? 'OFFICIAL CLASSROOM ATTENDANCE & PUNCTUALITY DOSSIER' :
    data.type === 'card' ? 'STUDENT IDENTITY VERIFICATION DOSSIER' :
    data.type === 'staff_payroll' ? 'FACULTY MONTHLY PAYSLIP VOUCHER' :
    'OFFICIAL ACADEMIC & FINANCIAL DOSSIER';

  const verificationRef = `VER-SGC-${new Date().getFullYear()}-${(data.id || '000').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;

  const cleanDocFilename = () => {
    const stdName = (student?.fullName || staff?.fullName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
    const typeStr = (data.type || 'DOCUMENT').toUpperCase();
    const idStr = (data.receiptNo || student?.rollNo || data.id || '000').replace(/[^a-zA-Z0-9]/g, '');
    return `SGC_${typeStr}_${stdName}_${idStr}`;
  };

  // Download high-resolution PNG image directly to gallery/PC
  const handleDownloadPNG = async () => {
    if (!documentRef.current) return;
    setIsDownloadingImage(true);
    const toastId = toast.loading('Generating ultra-high-resolution PNG image slip...');
    try {
      const filename = cleanDocFilename();
      await exportElementToImage(documentRef.current, filename, {
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      toast.dismiss(toastId);
      toast.success('PNG Image slip saved successfully to your downloads!');
    } catch (err) {
      console.error('Download PNG failed:', err);
      toast.dismiss(toastId);
      toast.error('Failed to generate image slip. You can also use Print / Save PDF.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  // Download PDF Document
  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Generating official PDF document...');
    try {
      const filename = cleanDocFilename();
      await exportElementToPdf(documentRef.current, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        marginMm: 6
      });
      toast.dismiss(toastId);
      toast.success('Official PDF document downloaded successfully!');
    } catch (err) {
      console.error('Download PDF failed:', err);
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppSupport = () => {
    const phone = '923014455891';
    const targetName = student?.fullName || staff?.fullName || data.id;
    const msg = encodeURIComponent(`Assalam o Alaikum, I am verifying document reference ${verificationRef} for ${targetName} (ID: ${data.id}). Kindly assist.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const totalPackageAmount = Number(feeCalc?.totalPackage || student?.totalPackage || 0);
  const feeReceivedAmount = Number(feeCalc?.feeReceived || student?.feeReceived || 0);
  const remainingBalanceAmount = Math.max(0, totalPackageAmount - feeReceivedAmount);
  const clearedPercent = totalPackageAmount > 0 ? Math.min(100, Math.round((feeReceivedAmount / totalPackageAmount) * 100)) : 0;

  return (
    <div 
      className="min-h-screen !bg-[#0f172a] sm:!bg-[#1e293b] flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:!bg-white font-sans selection:!bg-[#085a4e] selection:!text-white"
      style={{ colorScheme: 'light', backgroundColor: '#0f172a' }}
    >
      {/* Global CSS Anti-Inversion & Print Rules */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-hide {
            display: none !important;
          }
          #official-document-canvas {
            box-shadow: none !important;
            border: 2px solid #085a4e !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }

        /* Immunity from Mobile Browser Forced Dark Mode */
        .official-slip-root,
        .official-slip-root * {
          color-scheme: light !important;
          forced-color-adjust: none !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }

        .doc-label {
          color: #1e293b !important;
          font-weight: 700 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.04em !important;
        }

        .doc-value {
          color: #000000 !important;
          font-weight: 800 !important;
          font-size: 13.5px !important;
        }

        .doc-header-th {
          background-color: #085a4e !important;
          color: #ffffff !important;
          font-weight: 800 !important;
          font-size: 11px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 8px 12px !important;
        }

        .doc-table-td {
          color: #000000 !important;
          font-size: 12.5px !important;
          padding: 8px 12px !important;
          border-color: #cbd5e1 !important;
        }
      `}} />

      {/* ======================================================== */}
      {/* STICKY TOP ACTION TOOLBAR (PNG DOWNLOAD, PDF, PRINT) */}
      {/* ======================================================== */}
      <div className="sticky top-2 z-50 w-full max-w-2xl px-2 mb-4 print-hide">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] border-2 border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <Button
              onClick={handleDownloadPNG}
              disabled={isDownloadingImage || data.status !== 'verified'}
              className="rounded-xl !bg-[#085a4e] hover:!bg-[#06483e] !text-white font-black text-xs h-10 px-3.5 shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isDownloadingImage ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Download size={15} className="text-emerald-200" />
              )}
              <span>Download Image (PNG)</span>
            </Button>

            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPdf || data.status !== 'verified'}
              variant="outline"
              className="rounded-xl !border-slate-300 hover:!bg-slate-100 !text-slate-800 font-black text-xs h-10 px-3 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {isDownloadingPdf ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <FileDown size={15} className="text-[#085a4e]" />
              )}
              <span>Download PDF</span>
            </Button>

            <Button
              onClick={handlePrint}
              variant="ghost"
              className="rounded-xl hover:!bg-slate-100 !text-slate-700 font-bold text-xs h-10 px-2.5 shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Printer size={15} className="text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>

          <Button
            onClick={handleWhatsAppSupport}
            className="rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !text-white font-bold text-xs h-10 px-3 shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Phone size={14} />
            <span className="hidden sm:inline">Helpline</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STATE 1: LOADING */}
      {/* ======================================================== */}
      {data.status === 'loading' && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-12 shadow-2xl border border-slate-200 text-center space-y-4 my-auto">
          <div className="w-14 h-14 rounded-2xl border-4 border-[#085a4e]/20 border-t-[#085a4e] animate-spin flex items-center justify-center mx-auto" />
          <div>
            <h3 className="font-black text-slate-900 text-lg">Querying College Records Database...</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Verifying cryptographic record authenticity with Superior Group of Colleges central server.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STATE 2: UNVERIFIED / ERROR */}
      {/* ======================================================== */}
      {(data.status === 'unverified' || data.status === 'error') && (
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5 my-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-md">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-1.5">
            <Badge className="bg-rose-100 text-rose-800 border-none font-black text-xs px-3 py-1 rounded-full">
              UNVERIFIED RECORD
            </Badge>
            <h2 className="text-xl font-black text-slate-900">Document Verification Failed</h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {data.errorMessage || 'No matching record was found in the central college database.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono">
            Searched Reference ID: <strong className="text-slate-900">{data.id || 'Unknown'}</strong>
          </div>

          {/* Re-verify search bar */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
              <Search size={13} />
              <span>Search by Roll No, College No, or Student ID</span>
            </label>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <Input 
                placeholder="e.g. SGC-26-874, 1001, or Student ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 text-xs h-10 rounded-xl"
              />
              <Button 
                type="submit" 
                disabled={isSearching}
                className="!bg-[#085a4e] hover:!bg-[#06483e] !text-white font-black text-xs rounded-xl px-4 shrink-0 shadow-sm"
              >
                {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Verify Now'}
              </Button>
            </form>
            <p className="text-[10px] text-slate-500">
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
      )}

      {/* ======================================================== */}
      {/* STATE 3: VERIFIED OFFICIAL PHYSICAL SLIP / VOUCHER CANVAS */}
      {/* ======================================================== */}
      {data.status === 'verified' && (
        <div
          ref={documentRef}
          id="official-document-canvas"
          className="w-full max-w-2xl bg-white rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.5)] border-[3px] border-[#085a4e] p-5 sm:p-8 relative overflow-hidden official-slip-root mb-8"
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            colorScheme: 'light',
            boxSizing: 'border-box',
            outline: '1px solid #c9a84c',
            outlineOffset: '-5px'
          }}
        >
          {/* Subtle Security Watermark in the background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center select-none"
            style={{ backgroundImage: 'radial-gradient(#085a4e 1px, transparent 1px)', backgroundSize: '24px 24px' }}
          />

          {/* ======================================================== */}
          {/* SLIP HEADER: INSTITUTIONAL CREST & REGAL EMBLEM */}
          {/* ======================================================== */}
          <div className="relative z-10 text-center pb-3 border-b-2 border-[#085a4e]/30">
            <div className="flex flex-col items-center">
              {/* Authentic Circular Superior College Logo */}
              <div 
                className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white p-1 shadow-md border-2 border-[#c9a84c] flex items-center justify-center mb-2.5 relative overflow-hidden shrink-0"
                style={{ clipPath: 'circle(49.5% at 50% 50%)', backgroundColor: '#ffffff' }}
              >
                {collegeLogo ? (
                  <img 
                    src={collegeLogo} 
                    alt={collegeName} 
                    className="w-full h-full object-contain rounded-full select-none"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                ) : (
                  <School size={40} className="text-[#085a4e]" />
                )}
              </div>

              {/* College Institutional Title */}
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#085a4e] uppercase leading-tight font-serif" style={{ color: '#085a4e' }}>
                {collegeName || "Superior Group of Colleges"}
              </h1>
              
              <p className="text-[11.5px] font-bold text-slate-700 tracking-wide mt-0.5" style={{ color: '#334155' }}>
                Jahanian Campus • Directorate of Admissions & Accounts Registry
              </p>
              
              <p className="text-[9.5px] font-bold text-[#c9a84c] uppercase tracking-[0.18em] mt-0.5" style={{ color: '#927218' }}>
                Government Registered & Affiliated with BISE Multan • College Code: 3014
              </p>
            </div>

            {/* Regal Document Ribbon Banner */}
            <div 
              className="mt-3.5 py-1.5 px-4 rounded-lg text-center shadow-xs"
              style={{ backgroundColor: '#085a4e', color: '#ffffff' }}
            >
              <span className="text-xs sm:text-[13px] font-black uppercase tracking-[0.15em] text-white">
                ★ {docTitle} ★
              </span>
            </div>

            {/* Top Metadata Strip */}
            <div className="mt-3 grid grid-cols-3 items-center text-xs py-1 border-t border-b border-slate-200 gap-2 bg-slate-50/70 px-2 rounded">
              <div className="text-left">
                <span className="text-[10px] doc-label block">Slip / Ref #:</span>
                <span className="font-mono font-black text-[#085a4e] text-xs sm:text-sm" style={{ color: '#085a4e' }}>
                  {data.receiptNo || (student?.rollNo ? `REC-${student.rollNo}` : verificationRef)}
                </span>
              </div>
              <div className="text-center">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <Check size={11} className="text-emerald-700 stroke-[3]" />
                  <span>Verified Original</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] doc-label block">Issue / Print Date:</span>
                <span className="font-mono font-bold text-slate-900 text-[11px]" style={{ color: '#0f172a' }}>
                  {data.verifiedAt.split(',')[0]}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* STUDENT PARTICULARS STRUCTURED TABLE */}
          {/* ======================================================== */}
          {student && (
            <div className="mt-4 mb-4">
              <div className="border-2 border-[#085a4e]/40 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  {/* Column 1 */}
                  <div className="divide-y divide-slate-200">
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Student Full Name:</span>
                      <span className="doc-value text-slate-950 font-black text-sm">{student.fullName}</span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">Father's Name:</span>
                      <span className="doc-value text-slate-950 font-black text-sm">{student.fatherName}</span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Roll No / ID:</span>
                      <span className="font-mono font-black text-[#085a4e] text-sm" style={{ color: '#085a4e' }}>
                        {student.rollNo || student.id}
                      </span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">Class & Program:</span>
                      <span className="doc-value text-slate-950 font-black">
                        {student.group || student.category} {student.section ? `(Sec ${student.section})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Column 2 */}
                  <div className="divide-y divide-slate-200">
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Academic Session:</span>
                      <span className="doc-value text-slate-950 font-black">
                        {student.session || '2026-28'} • {student.academicPart || 'Part-1'}
                      </span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">Campus Branch:</span>
                      <span className="doc-value text-slate-950 font-black">
                        {student.campusDisplay || 'Superior College Jahanian'}
                      </span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Registered Phone:</span>
                      <span className="doc-value font-mono text-slate-950">
                        {student.contact || student.fatherContact || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">B-Form / CNIC:</span>
                      <span className="doc-value font-mono text-slate-950">
                        {student.bayFormNo || 'Registered / On File'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: COMPUTERIZED FEE RECEIPT (v=receipt) */}
          {/* ======================================================== */}
          {data.type === 'receipt' && student && (() => {
            const matchedTx = data.transactions?.find((t: any) => data.receiptNo && t.receipt_id === data.receiptNo) || data.transactions?.[0];
            const receiptAmount = matchedTx ? Number(matchedTx.amount || 0) : (student.feeReceived || 0);
            const receiptDisplayId = data.receiptNo || matchedTx?.receipt_id || `REC-${(student.rollNo || student.id || '101').replace(/[^a-zA-Z0-9]/g, '')}`;
            const receiptMethod = matchedTx?.payment_method || 'Official Cash / Online Deposit';

            return (
              <div className="space-y-4 my-2">
                {/* Itemized Accounts Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="doc-header-th">Payment Particulars / Head</th>
                        <th className="doc-header-th">Mode</th>
                        <th className="doc-header-th">Receipt ID</th>
                        <th className="doc-header-th text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      <tr>
                        <td className="doc-table-td">
                          <strong className="text-slate-950 font-bold block">College Tuition & Academic Installment</strong>
                          <span className="text-[10px] text-slate-600 block">Registration, Science Labs & Library Fee</span>
                        </td>
                        <td className="doc-table-td capitalize text-slate-800 font-medium">
                          {receiptMethod}
                        </td>
                        <td className="doc-table-td font-mono font-bold text-[#085a4e]" style={{ color: '#085a4e' }}>
                          {receiptDisplayId}
                        </td>
                        <td className="doc-table-td text-right font-mono font-black text-emerald-800 text-base" style={{ color: '#047857' }}>
                          Rs. {receiptAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Amount in words banner */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="doc-label mr-2">Amount in Words:</span>
                  <span className="font-serif italic font-black text-slate-900 text-sm" style={{ color: '#0f172a' }}>
                    {convertNumberToWords(receiptAmount)}
                  </span>
                </div>

                {/* 3 Metric Ledger Summary Boxes */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-300">
                    <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Total Package</span>
                    <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5" style={{ color: '#000000' }}>
                      Rs. {totalPackageAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                    <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Total Paid</span>
                    <span className="font-mono font-black text-emerald-900 text-sm sm:text-base block mt-0.5" style={{ color: '#064e3b' }}>
                      Rs. {feeReceivedAmount.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300">
                    <span className="text-[10px] font-black text-rose-900 uppercase block tracking-wider">Remaining Balance</span>
                    <span className="font-mono font-black text-rose-950 text-sm sm:text-base block mt-0.5" style={{ color: '#881337' }}>
                      Rs. {remainingBalanceAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Dual Official Stamp & Signature Block */}
                <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Authentic Rubber Paid Stamp */}
                  <div className="border-[2.5px] border-emerald-700 rounded-xl px-4 py-2 text-center rotate-[-2deg] bg-emerald-50/80 shadow-xs">
                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest flex items-center justify-center gap-1.5" style={{ color: '#065f46' }}>
                      <CheckCircle2 size={15} /> PAID & VERIFIED
                    </span>
                    <span className="text-[9.5px] font-black text-emerald-700 block mt-0.5 uppercase tracking-wider" style={{ color: '#047857' }}>
                      SUPERIOR COLLEGE JAHANIAN
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-600 block mt-0.5 font-mono">
                      ACCOUNTS DESK • {data.verifiedAt.split(',')[0]}
                    </span>
                  </div>

                  {/* Signatures */}
                  <div className="flex items-center gap-8 text-center text-xs">
                    <div>
                      <div className="w-28 border-b-2 border-slate-400 mb-1" />
                      <span className="doc-label text-[10px] block">Accounts Officer</span>
                    </div>
                    <div>
                      <div className="w-28 border-b-2 border-slate-400 mb-1" />
                      <span className="doc-label text-[10px] block">Principal / In-Charge</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* VIEW 2: ADMISSION CONFIRMATION SLIP (v=admission) */}
          {/* ======================================================== */}
          {data.type === 'admission' && student && (
            <div className="space-y-4 my-2">
              {/* Enrolment confirmation alert */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-950">
                  <Sparkles size={16} className="text-emerald-700" />
                  <span>Official Admission Confirmed & Enrolled</span>
                </div>
                <span className="text-[10.5px] font-mono font-bold text-emerald-900 bg-white px-2.5 py-0.5 rounded border border-emerald-300">
                  Session {student.session || '2026-28'}
                </span>
              </div>

              {/* Curriculum Subjects Badges */}
              {student.subjects && student.subjects.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                  <span className="doc-label block mb-2 flex items-center gap-1.5">
                    <BookOpen size={13} className="text-[#085a4e]" />
                    <span>Registered Course Curriculum:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {student.subjects.map((sub: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-950 font-black text-xs shadow-2xs"
                        style={{ color: '#000000' }}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agreed Fee Structure */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Agreed Package</span>
                  <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5" style={{ color: '#000000' }}>
                    Rs. {totalPackageAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Fee Deposited</span>
                  <span className="font-mono font-black text-emerald-900 text-sm sm:text-base block mt-0.5" style={{ color: '#064e3b' }}>
                    Rs. {feeReceivedAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-800 uppercase block tracking-wider">Remaining Dues</span>
                  <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5" style={{ color: '#000000' }}>
                    Rs. {remainingBalanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Admissions Directorate Stamp & Signatures */}
              <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="border-[2.5px] border-[#085a4e] rounded-xl px-4 py-2 text-center rotate-[-1deg] bg-slate-50">
                  <span className="text-xs font-black text-[#085a4e] uppercase tracking-widest flex items-center justify-center gap-1.5" style={{ color: '#085a4e' }}>
                    <ShieldCheck size={15} /> ADMISSION APPROVED
                  </span>
                  <span className="text-[9px] font-black text-slate-800 block mt-0.5 uppercase tracking-wider">
                    OFFICE OF ADMISSIONS & STUDENT AFFAIRS
                  </span>
                </div>

                <div className="flex items-center gap-8 text-center text-xs">
                  <div>
                    <div className="w-28 border-b-2 border-slate-400 mb-1" />
                    <span className="doc-label text-[10px] block">Admission Incharge</span>
                  </div>
                  <div>
                    <div className="w-28 border-b-2 border-slate-400 mb-1" />
                    <span className="doc-label text-[10px] block">Principal, SGC Jahanian</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: ACADEMIC RESULT CARD (v=result) */}
          {/* ======================================================== */}
          {data.type === 'result' && student && (() => {
            const totalObtainedMarks = data.academicRecords?.reduce((acc: number, r: any) => acc + Number(r.obtained_marks || 0), 0) || 0;
            const totalMaxMarks = data.academicRecords?.reduce((acc: number, r: any) => acc + Number(r.total_marks || 100), 0) || 0;
            const resultPercentage = totalMaxMarks > 0 ? Math.round((totalObtainedMarks / totalMaxMarks) * 100) : 0;
            const isPassed = resultPercentage >= 50;

            return (
              <div className="space-y-4 my-2">
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="doc-header-th">Assessment / Test</th>
                        <th className="doc-header-th">Subject</th>
                        <th className="doc-header-th text-center">Marks Obtained</th>
                        <th className="doc-header-th text-center">Percentage</th>
                        <th className="doc-header-th text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {data.academicRecords && data.academicRecords.length > 0 ? (
                        data.academicRecords.map((rec, idx) => {
                          const pct = rec.total_marks > 0 ? Math.round((rec.obtained_marks / rec.total_marks) * 100) : 0;
                          return (
                            <tr key={idx}>
                              <td className="doc-table-td font-bold text-slate-950">{rec.test_name || 'Class Test'}</td>
                              <td className="doc-table-td font-medium text-slate-800">{rec.subject}</td>
                              <td className="doc-table-td text-center font-mono font-black text-slate-950">
                                {rec.obtained_marks} / {rec.total_marks}
                              </td>
                              <td className="doc-table-td text-center">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${pct >= 70 ? 'bg-emerald-100 text-emerald-900' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'}`}>
                                  {pct}%
                                </span>
                              </td>
                              <td className="doc-table-td text-right font-mono text-[11px] text-slate-600">
                                {rec.date ? new Date(rec.date).toLocaleDateString('en-GB') : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-xs text-slate-600 font-medium">
                            Student is actively enrolled in session {student.session || '2026-28'}. Monthly examination results are uploaded on the central portal upon evaluation.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalMaxMarks > 0 && (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-300">
                      <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Total Marks</span>
                      <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5">
                        {totalObtainedMarks} / {totalMaxMarks}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                      <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Aggregate %</span>
                      <span className="font-mono font-black text-emerald-900 text-sm sm:text-base block mt-0.5">
                        {resultPercentage}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300">
                      <span className="text-[10px] font-black text-slate-800 uppercase block tracking-wider">Standing</span>
                      <span className="font-black text-slate-950 text-sm sm:text-base block mt-0.5">
                        {isPassed ? '✓ Passed' : 'Needs Attention'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Controller of Examinations Seal */}
                <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="border-[2.5px] border-[#c9a84c] rounded-xl px-4 py-2 text-center rotate-[-1deg] bg-amber-50/70">
                    <span className="text-xs font-black text-amber-950 uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <Award size={15} className="text-[#c9a84c]" /> EXAMINATION OFFICE VERIFIED
                    </span>
                    <span className="text-[9px] font-black text-slate-800 block mt-0.5 uppercase tracking-wider">
                      SUPERIOR GROUP OF COLLEGES JAHANIAN
                    </span>
                  </div>

                  <div className="flex items-center gap-8 text-center text-xs">
                    <div>
                      <div className="w-28 border-b-2 border-slate-400 mb-1" />
                      <span className="doc-label text-[10px] block">Tabulator</span>
                    </div>
                    <div>
                      <div className="w-28 border-b-2 border-slate-400 mb-1" />
                      <span className="doc-label text-[10px] block">Controller of Exams</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* VIEW 4: FEE ACCOUNT STATEMENT / LEDGER (v=statement) */}
          {/* ======================================================== */}
          {(data.type === 'statement' || data.type === 'challan') && student && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Total Package</span>
                  <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5">
                    Rs. {totalPackageAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Paid So Far</span>
                  <span className="font-mono font-black text-emerald-900 text-sm sm:text-base block mt-0.5">
                    Rs. {feeReceivedAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300">
                  <span className="text-[10px] font-black text-rose-900 uppercase block tracking-wider">Current Due</span>
                  <span className="font-mono font-black text-rose-950 text-sm sm:text-base block mt-0.5">
                    Rs. {(feeCalc?.currentInstallmentDue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-800 uppercase block tracking-wider">Total Balance</span>
                  <span className="font-mono font-black text-slate-950 text-sm sm:text-base block mt-0.5">
                    Rs. {remainingBalanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span>Package Clearance Status</span>
                  <span className="font-mono text-[#085a4e]">{clearedPercent}% Cleared</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                  <div 
                    className="h-full bg-gradient-to-r from-[#085a4e] to-emerald-500 rounded-full"
                    style={{ width: `${clearedPercent}%` }}
                  />
                </div>
              </div>

              {/* Verified Transactions Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="doc-header-th">Receipt ID</th>
                      <th className="doc-header-th">Payment Date</th>
                      <th className="doc-header-th">Mode</th>
                      <th className="doc-header-th text-right">Amount Deposited</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {data.transactions && data.transactions.length > 0 ? (
                      data.transactions.map((tx, idx) => (
                        <tr key={idx}>
                          <td className="doc-table-td font-mono font-black text-[#085a4e]" style={{ color: '#085a4e' }}>
                            {tx.receipt_id || `REC-${idx + 1}`}
                          </td>
                          <td className="doc-table-td font-medium text-slate-800">
                            {tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </td>
                          <td className="doc-table-td capitalize text-slate-800 font-medium">
                            {tx.payment_method || 'Cash / Bank'}
                          </td>
                          <td className="doc-table-td text-right font-mono font-black text-emerald-800 text-sm" style={{ color: '#047857' }}>
                            Rs. {Number(tx.amount || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-xs text-slate-600">
                          Initial fee deposit recorded at admission: <strong>Rs. {feeReceivedAmount.toLocaleString()}</strong>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Accounts Directorate Stamp */}
              <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="border-[2.5px] border-[#085a4e] rounded-xl px-4 py-2 text-center rotate-[-1deg] bg-slate-50">
                  <span className="text-xs font-black text-[#085a4e] uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Receipt size={15} /> OFFICIAL FINANCIAL LEDGER
                  </span>
                  <span className="text-[9px] font-black text-slate-800 block mt-0.5 uppercase tracking-wider">
                    DIRECTORATE OF ACCOUNTS & FINANCE
                  </span>
                </div>

                <div className="flex items-center gap-8 text-center text-xs">
                  <div>
                    <div className="w-28 border-b-2 border-slate-400 mb-1" />
                    <span className="doc-label text-[10px] block">Ledger Officer</span>
                  </div>
                  <div>
                    <div className="w-28 border-b-2 border-slate-400 mb-1" />
                    <span className="doc-label text-[10px] block">Director Finance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 5: ATTENDANCE DOSSIER (v=attendance) */}
          {/* ======================================================== */}
          {data.type === 'attendance' && student && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Days Present</span>
                  <span className="font-mono font-black text-emerald-800 text-xl block mt-0.5">
                    {data.attendanceStats?.presentDays ?? 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Days Absent</span>
                  <span className="font-mono font-black text-rose-800 text-xl block mt-0.5">
                    {data.attendanceStats?.absentDays ?? 0}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Attendance %</span>
                  <span className="font-mono font-black text-emerald-950 text-xl block mt-0.5">
                    {data.attendanceStats?.attendancePercent ?? 100}%
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed text-left">
                <strong className="text-slate-950 font-black block mb-0.5">BISE Board Exam Eligibility Rule:</strong>
                <span>Under BISE regulations, a minimum of 75% classroom attendance is mandatory to be eligible for annual board examinations. Regular attendance is strongly advised.</span>
              </div>

              {/* Discipline Officer Seal */}
              <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="border-[2.5px] border-[#085a4e] rounded-xl px-4 py-2 text-center rotate-[-1deg] bg-slate-50">
                  <span className="text-xs font-black text-[#085a4e] uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Calendar size={15} /> ATTENDANCE RECORD VERIFIED
                  </span>
                  <span className="text-[9px] font-black text-slate-800 block mt-0.5 uppercase tracking-wider">
                    OFFICE OF VICE PRINCIPAL (DISCIPLINE)
                  </span>
                </div>

                <div className="text-center text-xs">
                  <div className="w-32 border-b-2 border-slate-400 mb-1" />
                  <span className="doc-label text-[10px] block">Vice Principal (Discipline)</span>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 6: GENERAL 360 DOSSIER (v=general / default) */}
          {/* ======================================================== */}
          {(data.type === 'general' || data.type === 'card' || data.type === 'student') && student && (
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border-2 border-slate-300">
                  <span className="text-[10px] font-black text-slate-700 uppercase block tracking-wider">Total Package</span>
                  <span className="font-mono font-black text-slate-950 text-sm block mt-0.5">
                    Rs. {totalPackageAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                  <span className="text-[10px] font-black text-emerald-900 uppercase block tracking-wider">Paid Fee</span>
                  <span className="font-mono font-black text-emerald-900 text-sm block mt-0.5">
                    Rs. {feeReceivedAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300">
                  <span className="text-[10px] font-black text-rose-900 uppercase block tracking-wider">Remaining</span>
                  <span className="font-mono font-black text-rose-950 text-sm block mt-0.5">
                    Rs. {remainingBalanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {student.subjects && student.subjects.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left">
                  <span className="doc-label block mb-1.5">Enrolled Subjects:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {student.subjects.map((sub: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-0.5 rounded bg-white border border-slate-300 text-slate-900 font-bold text-[11px]">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* IF STAFF RECORD */}
          {/* ======================================================== */}
          {staff && (
            <div className="space-y-4 my-2">
              <div className="border-2 border-[#085a4e]/40 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  <div className="divide-y divide-slate-200">
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Faculty Member:</span>
                      <span className="doc-value text-slate-950 font-black text-sm">{staff.fullName}</span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">Designation / Role:</span>
                      <span className="doc-value text-slate-950 font-black">{staff.role || 'Professor'}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-200">
                    <div className="flex items-center px-3.5 py-2 bg-white">
                      <span className="w-32 shrink-0 doc-label">Faculty Staff ID:</span>
                      <span className="font-mono font-black text-[#085a4e] text-sm">{staff.id}</span>
                    </div>
                    <div className="flex items-center px-3.5 py-2 bg-slate-50/80">
                      <span className="w-32 shrink-0 doc-label">Campus Branch:</span>
                      <span className="doc-value text-slate-950 font-black">Superior College Jahanian</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SLIP FOOTER: BARCODE, LIVE QR, AND LEGAL AUTHENTICITY */}
          {/* ======================================================== */}
          <div className="mt-5 pt-4 border-t-2 border-[#085a4e]/30 bg-slate-50/60 p-3.5 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 text-center sm:text-left">
              {/* Left: Scannable QR Code */}
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 shrink-0 shadow-2xs">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[8px] text-slate-400 font-mono">
                      QR CODE
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <span className="doc-label text-[9.5px] block">Live Verification</span>
                  <span className="text-[9px] text-slate-600 block leading-tight font-medium">
                    Scan with camera to verify live from central server.
                  </span>
                </div>
              </div>

              {/* Center: Computerized Security Barcode */}
              <div className="flex justify-center">
                <BarcodeSvg value={verificationRef} />
              </div>

              {/* Right: College Contact & Registry */}
              <div className="text-center sm:text-right text-[10px] text-slate-600">
                <strong className="text-slate-900 block font-black uppercase text-[10px]">Superior Group of Colleges</strong>
                <span>Old Multan Road, Jahanian</span>
                <span className="block font-mono text-[#085a4e] font-bold">Helpline: 0301-4455891</span>
              </div>
            </div>

            {/* Micro Legal Disclaimer */}
            <div className="mt-2.5 pt-2 border-t border-slate-200 text-[9px] text-slate-500 text-center leading-tight">
              Notice: This computerized official document is digitally issued by Superior College Jahanian. Any unauthorized tampering, manual erasure, or forgery is strictly illegal.
            </div>
          </div>
        </div>
      )}

      {/* Admin Portal Link */}
      {onGoToAdmin && (
        <div className="mb-6 print-hide">
          <Button 
            variant="ghost" 
            onClick={onGoToAdmin} 
            className="text-xs !text-slate-400 hover:!text-white font-bold cursor-pointer"
          >
            Staff / Administration Portal Login ➔
          </Button>
        </div>
      )}
    </div>
  );
}
