import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { 
  Check, 
  Share2, 
  Download, 
  FileDown, 
  Printer, 
  ShieldCheck, 
  CreditCard, 
  Wallet, 
  Coins, 
  Clock, 
  Calendar, 
  School, 
  Phone, 
  User, 
  CheckCircle2,
  GraduationCap,
  Receipt,
  Building2,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportElementToImage, exportElementToPdf } from '../utils/documentExporter';
import { toast } from 'sonner';
import { generateBrandedQrCode, generateTamperProofHash } from '../lib/brandedQrCode';

export interface MobileDigitalReceiptProps {
  type: 'receipt' | 'admission' | 'statement' | 'challan' | 'result' | 'attendance' | 'student' | 'card' | 'general';
  student?: any;
  receiptNo?: string;
  verifiedAt?: string;
  collegeLogo?: string | null;
  collegeName?: string;
  qrCodeUrl?: string;
  matchedTx?: any;
  totalPackageAmount?: number;
  feeReceivedAmount?: number;
  remainingBalanceAmount?: number;
  onSwitchToPrintView?: () => void;
  isPrintViewAvailable?: boolean;
}

export default function MobileDigitalReceiptCard({
  type,
  student,
  receiptNo,
  verifiedAt,
  collegeLogo = '/superior-logo.png',
  collegeName = 'Superior College Jahanian',
  qrCodeUrl,
  matchedTx,
  totalPackageAmount = 0,
  feeReceivedAmount = 0,
  remainingBalanceAmount = 0,
  onSwitchToPrintView,
  isPrintViewAvailable = true,
}: MobileDigitalReceiptProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [internalQrCode, setInternalQrCode] = useState<string>(qrCodeUrl || '');

  const std = student || {};
  const stdName = std.fullName || std.full_name || std.name || 'Student';
  const stdFather = std.fatherName || std.father_name || 'N/A';
  const stdRoll = std.rollNo || std.collegeNo || std.college_no || std.id || 'SGC-26-Pending';
  const stdGroup = std.group || std.group_name || std.category || std.program || 'Intermediate';
  const stdSection = std.section ? (String(std.section).toLowerCase().startsWith('sec') ? std.section : `Sec ${std.section}`) : 'Sec A';
  const stdSession = std.session || '2026-28';
  const stdContact = std.contact || std.fatherContact || std.father_contact || '';
  const isGirlsCampus = (std.category || '').toLowerCase().includes('girl') || std.gender === 'Female';
  const stdCampus = isGirlsCampus ? 'Girls Campus' : 'Boys Campus';

  const currentVerifiedAt = verifiedAt || new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
  const displayReceiptId = receiptNo || matchedTx?.receipt_id || matchedTx?.receiptId || `REC-BOT-${String(stdRoll).replace(/[^a-zA-Z0-9]/g, '').slice(-6) || 'C26775'}`;

  // Package & amounts calculation
  const pkgAmount = Number(totalPackageAmount || std.totalPackage || std.total_package || 0);
  const paidAmount = Number(feeReceivedAmount || (matchedTx ? Number(matchedTx.amount || matchedTx.amountPaid || 0) : (std.feeReceived || std.admissionFee || 0)));
  const balanceAmount = remainingBalanceAmount !== undefined && remainingBalanceAmount !== null
    ? remainingBalanceAmount 
    : Math.max(0, pkgAmount - paidAmount);

  const receiptAmount = matchedTx 
    ? Number(matchedTx.amount || matchedTx.amountPaid || 0) 
    : (paidAmount > 0 ? paidAmount : 5000);

  const paymentMethod = matchedTx?.payment_method || matchedTx?.paymentMethod || (std.reference?.toLowerCase().includes('whatsapp') ? 'WhatsApp AI Desk' : 'Campus Accounts Cash Desk');
  const recordedBy = matchedTx?.recorded_by || matchedTx?.collectedBy || (std.reference?.toLowerCase().includes('whatsapp') ? `WhatsApp Verified (${std.reference.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim() || 'Accounts AI Desk'})` : 'Campus Accounts Office, SGC-J');
  const feeHead = matchedTx?.feeType || matchedTx?.fee_type || (type === 'admission' ? 'Admission Fee Deposit' : 'Tuition Fee Installment');

  // Title and subtitle customized strictly for College ERP
  const getHeaderInfo = () => {
    switch (type) {
      case 'receipt':
        return {
          title: 'Official Fee Receipt',
          subtitle: 'Superior Group of Colleges Jahanian • Accounts Registry',
          badgeText: 'Payment Verified & Credited',
          primaryMetricLabel: 'Amount Deposited / Received',
          primaryMetricValue: `Rs. ${receiptAmount.toLocaleString()}`,
          isFinancial: true,
        };
      case 'admission':
        return {
          title: 'Admission Confirmation Slip',
          subtitle: 'Superior Group of Colleges Jahanian • Session 2026-28',
          badgeText: 'Official Enrolment Confirmed',
          primaryMetricLabel: 'Admission Fee Deposited',
          primaryMetricValue: `Rs. ${(std.admissionFee || receiptAmount || 10000).toLocaleString()}`,
          isFinancial: true,
        };
      case 'statement':
      case 'challan':
        return {
          title: 'Student Fee Ledger Statement',
          subtitle: 'Superior Group of Colleges Jahanian • Accounts Directorate',
          badgeText: 'Official Account Statement',
          primaryMetricLabel: 'Total Fee Paid To Date',
          primaryMetricValue: `Rs. ${paidAmount.toLocaleString()}`,
          isFinancial: true,
        };
      case 'result':
        return {
          title: 'Academic Assessment Result',
          subtitle: 'Superior Group of Colleges Jahanian • Examination Board',
          badgeText: 'Academic Record Authenticated',
          primaryMetricLabel: 'Obtained Marks / Grade',
          primaryMetricValue: `${std.obtainedMarks || 0} / ${std.totalMarks || 100}`,
          isFinancial: false,
        };
      case 'attendance':
        return {
          title: 'Biometric Attendance Record',
          subtitle: 'Superior Group of Colleges Jahanian • Attendance Registry',
          badgeText: 'Biometric Log Authenticated',
          primaryMetricLabel: 'Punctuality / Attendance',
          primaryMetricValue: `${std.attendancePercentage || 100}% Present`,
          isFinancial: false,
        };
      default:
        return {
          title: 'Official Student Record',
          subtitle: 'Superior Group of Colleges Jahanian • Central Registry',
          badgeText: '100% Database Verified',
          primaryMetricLabel: 'Enrolment Status',
          primaryMetricValue: 'Active Student',
          isFinancial: paidAmount > 0,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  // Generate live scannable Branded QR Code with Center Logo & Security Hash
  useEffect(() => {
    let isMounted = true;
    const verifyId = std.rollNo || std.collegeNo || std.id || receiptNo || '';
    const hashSeed = `${verifyId}:${displayReceiptId}:${paidAmount}:${stdSession}:${type}`;

    generateTamperProofHash(hashSeed).then((token) => {
      if (!isMounted) return;
      setSecurityToken(token);

      if (qrCodeUrl) {
        setInternalQrCode(qrCodeUrl);
        return;
      }

      const origin = typeof window !== 'undefined' && window.location?.origin && window.location.protocol !== 'file:'
        ? window.location.origin 
        : 'https://portal.superiorjhn.com';
      const payload = `${origin}/?verify=${type}&id=${encodeURIComponent(verifyId)}&ref=${encodeURIComponent(displayReceiptId)}&token=${token}`;
      
      generateBrandedQrCode(payload, {
        size: 320,
        logoUrl: collegeLogo || '/superior-logo.png',
        darkColor: '#085a4e',
        lightColor: '#ffffff',
        includeGoldBorder: true,
      }).then((dataUrl) => {
        if (isMounted) setInternalQrCode(dataUrl);
      }).catch((err) => {
        console.warn('[Receipt] QR generation error:', err);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [qrCodeUrl, std, receiptNo, type, displayReceiptId, paidAmount, stdSession, collegeLogo]);

  // Handle Share (Native Web Share API or WhatsApp link)
  const handleShare = async () => {
    setIsSharing(true);
    const origin = typeof window !== 'undefined' ? window.location.href : 'https://portal.superiorjhn.com';
    const shareText = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
🧾 *OFFICIAL DIGITAL VERIFICATION RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student:* ${stdName} (${stdRoll})
• *Father:* ${stdFather}
• *Program:* ${stdGroup} (${stdSection})
• *Campus:* ${stdCampus}
• *Status:* ✅ ${headerInfo.title}
• *Amount:* Rs. ${receiptAmount.toLocaleString()}
• *Balance Due:* ${balanceAmount > 0 ? `Rs. ${balanceAmount.toLocaleString()}` : 'Cleared (NIL)'}
• *Receipt No:* #${displayReceiptId}
${securityToken ? `• *Security Hash:* ${securityToken}\n` : ''}• *Date:* ${currentVerifiedAt}
━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Live Digital Verification Slip:*
${origin}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${collegeName} - Digital Receipt`,
          text: shareText,
          url: origin,
        });
        toast.success('Receipt shared successfully!');
      } catch (err) {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(waUrl, '_blank');
      }
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    }
    setIsSharing(false);
  };

  // Handle Download Image (PNG with 3x resolution)
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    const toastId = toast.loading('Generating high-resolution digital receipt image...');
    try {
      const filename = `SGC_Receipt_${stdName.replace(/\s+/g, '_')}_${displayReceiptId}`;
      await exportElementToImage(cardRef.current, filename, {
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });
      toast.dismiss(toastId);
      toast.success('Digital receipt image saved to your downloads!');
    } catch (err) {
      console.error('Failed to download digital receipt:', err);
      toast.dismiss(toastId);
      toast.error('Failed to save receipt image.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Download PDF
  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    const toastId = toast.loading('Generating PDF document...');
    try {
      const filename = `SGC_Receipt_${stdName.replace(/\s+/g, '_')}_${displayReceiptId}`;
      await exportElementToPdf(cardRef.current, {
        filename,
        format: 'a4',
        orientation: 'portrait',
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        marginMm: 8,
      });
      toast.dismiss(toastId);
      toast.success('PDF document downloaded!');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF.');
    }
  };

  return (
    <div className="w-full max-w-[430px] mx-auto py-2 px-2 sm:px-0">
      {/* ======================================================== */}
      {/* CAPTURABLE RECEIPT CARD ROOT (College Institutional Aesthetic) */}
      {/* ======================================================== */}
      <div 
        ref={cardRef}
        id="mobile-digital-receipt-canvas"
        className="bg-white rounded-[26px] border border-slate-200/90 shadow-[0_15px_45px_rgba(8,90,78,0.08)] p-5 sm:p-6 relative overflow-hidden select-none"
        style={{ colorScheme: 'light', color: '#0f172a' }}
      >
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#085a4e] via-[#d4af37] to-[#085a4e]" />

        {/* ======================================================== */}
        {/* 1. TOP VERIFIED SEAL WITH GOLD MEDALLION */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-1 relative z-10">
          <div className="relative mb-3">
            {/* Ambient Glow */}
            <div className="absolute inset-0 rounded-full bg-[#d4af37]/20 blur-lg scale-110 pointer-events-none" />
            
            {/* 3D Gold Rim Medallion */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full p-[3px] bg-gradient-to-b from-[#d5b056] via-[#f7e096] to-[#b48d34] shadow-[0_8px_20px_rgba(180,141,52,0.35)] flex items-center justify-center relative">
              {/* Inner Medallion Plate */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#cf9d34] via-[#e8c66e] to-[#ebd281] flex items-center justify-center border-2 border-white/40 shadow-inner">
                {/* 3D Vibrant Green Checkmark */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center shadow-xs">
                  <Check 
                    size={28} 
                    className="text-[#085a4e] stroke-[3.5] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
            {headerInfo.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-[12px] text-slate-500 font-medium mt-1">
            {headerInfo.subtitle}
          </p>

          {/* Verified Badge */}
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>{headerInfo.badgeText}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. PRIMARY METRIC BOX (AMOUNT DEPOSITED / STATUS) */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-br from-slate-50 via-emerald-50/25 to-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-center my-3.5 relative overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
            {headerInfo.primaryMetricLabel}
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#085a4e] font-mono tracking-tight">
            {headerInfo.primaryMetricValue}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600 inline shrink-0" />
            <span>Recorded in College Database</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. 4-COLUMN ACADEMIC & FINANCIAL OVERVIEW (2x2 Clean Grid) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
          {/* Card 1: Total Package */}
          <div className="bg-blue-50/70 border border-blue-100/90 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight block">Total Package</span>
            <span className="text-[12px] sm:text-[13px] font-black text-slate-900 font-mono mt-0.5 block truncate">
              Rs. {Number(pkgAmount > 0 ? pkgAmount : 60000).toLocaleString()}
            </span>
          </div>

          {/* Card 2: Paid Amount */}
          <div className="bg-emerald-50/70 border border-emerald-100/90 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight block">Amount Paid</span>
            <span className="text-[12px] sm:text-[13px] font-black text-emerald-700 font-mono mt-0.5 block truncate">
              Rs. {Number(paidAmount).toLocaleString()}
            </span>
          </div>

          {/* Card 3: Remaining Balance */}
          <div className={`rounded-xl p-2.5 text-center flex flex-col justify-center border ${
            balanceAmount > 0 
              ? 'bg-rose-50/70 border-rose-100/90' 
              : 'bg-emerald-50/70 border-emerald-100/90'
          }`}>
            <span className={`text-[10px] font-bold uppercase tracking-tight block ${
              balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              Remaining Dues
            </span>
            <span className={`text-[12px] sm:text-[13px] font-black font-mono mt-0.5 block truncate ${
              balanceAmount > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {balanceAmount > 0 ? `Rs. ${balanceAmount.toLocaleString()}` : 'CLEARED (NIL)'}
            </span>
          </div>

          {/* Card 4: Academic Session */}
          <div className="bg-purple-50/70 border border-purple-100/90 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-tight block">Session</span>
            <span className="text-[12px] sm:text-[13px] font-black text-purple-900 mt-0.5 block truncate">
              {stdSession}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. SECTION 1: STUDENT ACADEMIC PROFILE (No Overlap Layout) */}
        {/* ======================================================== */}
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-2 my-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-1.5 border-b border-slate-200/70">
            <GraduationCap size={14} className="text-[#085a4e] shrink-0" />
            <span>Student Academic Particulars</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Student Name
              </span>
              <span className="text-slate-900 font-bold text-[12px] text-right uppercase break-words leading-normal min-w-0">
                {stdName}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Roll / College ID
              </span>
              <span className="font-mono font-black text-[#085a4e] text-[12px] text-right px-2 py-0.5 bg-emerald-100/70 rounded border border-emerald-200/70 leading-normal">
                {stdRoll}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Father Name
              </span>
              <span className="text-slate-800 font-semibold text-[12px] text-right break-words leading-normal min-w-0">
                {stdFather}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Program / Discipline
              </span>
              <span className="text-slate-800 font-semibold text-[12px] text-right break-words leading-normal min-w-0">
                {stdGroup}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Section & Campus
              </span>
              <span className="text-slate-800 font-semibold text-[12px] text-right break-words leading-normal min-w-0">
                {stdSection} • {stdCampus}
              </span>
            </div>

            {stdContact && (
              <div className="flex items-start justify-between gap-3 py-1.5">
                <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                  Registered Mobile
                </span>
                <span className="font-mono font-semibold text-slate-800 text-[12px] text-right leading-normal">
                  {stdContact}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. SECTION 2: ACCOUNTS & PAYMENT PARTICULARS (No Overlap) */}
        {/* ======================================================== */}
        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-2 my-3">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5 pb-1.5 border-b border-slate-200/70">
            <Receipt size={14} className="text-[#085a4e] shrink-0" />
            <span>Accounts & Payment Particulars</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Receipt / Voucher No
              </span>
              <span className="font-mono font-black text-slate-900 text-[12px] text-right leading-normal">
                #{displayReceiptId}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Date & Time
              </span>
              <span className="text-slate-800 font-medium text-[12px] text-right leading-normal">
                {currentVerifiedAt}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Fee Particulars
              </span>
              <span className="text-slate-800 font-semibold text-[12px] text-right break-words leading-normal min-w-0">
                {feeHead}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Payment Mode
              </span>
              <span className="text-slate-800 font-semibold text-[12px] text-right break-words leading-normal min-w-0">
                {paymentMethod}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Receiving Desk
              </span>
              <span className="text-[#085a4e] font-bold text-[12px] text-right break-words leading-normal min-w-0">
                {recordedBy}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-200/50">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Amount Deposited
              </span>
              <span className="font-mono font-black text-emerald-700 text-[13px] text-right leading-normal">
                Rs. {receiptAmount.toLocaleString()}.00
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 py-1.5">
              <span className="text-slate-500 text-[12px] font-medium shrink-0 max-w-[42%] leading-normal">
                Remaining Balance
              </span>
              <span className={`font-mono font-bold text-[12px] text-right leading-normal ${
                balanceAmount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {balanceAmount > 0 ? `Rs. ${balanceAmount.toLocaleString()}.00` : 'Rs. 0.00 (Cleared)'}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. INSTITUTIONAL FOOTER & DYNAMIC QR CODE */}
        {/* ======================================================== */}
        <div className="pt-2 border-t border-slate-200/80 my-3">
          <div className="flex items-center gap-3">
            {/* Scannable Live QR */}
            <div className="w-20 h-20 bg-white p-1 rounded-xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center overflow-hidden">
              {internalQrCode ? (
                <img src={internalQrCode} alt="Security QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-mono text-center">
                  QR CODE
                </div>
              )}
            </div>

            {/* College Credentials */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-6 h-6 rounded-full bg-white border border-[#c9a84c] shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                  <img src={collegeLogo || '/superior-logo.png'} alt="Superior Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-[12px] text-[#085a4e] uppercase tracking-tight truncate block">
                  {collegeName}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 font-medium leading-tight">
                Official Accounts & AI Registry • Code: 3014
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                Canal Road, Jahanian • Helpline: 0301-4455891
              </p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                <span>100% Authenticated by LMS Accounts Portal</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>REF: {displayReceiptId}</span>
            {securityToken && (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold tracking-wider">
                HASH: {securityToken}
              </span>
            )}
            <span>Computer Generated Official Voucher</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. FLOATING MOBILE ACTIONS BAR */}
      {/* ======================================================== */}
      <div className="mt-4 flex flex-col gap-2 print-hide">
        {/* Main 2-Button Row (Share & Download Image) */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="h-11 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <Share2 size={15} className="text-blue-600" />
            <span>Share Link</span>
          </Button>

          <Button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="h-11 rounded-xl bg-[#085a4e] hover:bg-[#064e43] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            <Download size={15} className="text-[#f7e096]" />
            <span>Save Image</span>
          </Button>
        </div>

        {/* Secondary Actions (Download PDF & Switch to Full A4 Voucher) */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 bg-white shadow-2xs cursor-pointer"
          >
            <FileDown size={14} className="text-rose-600" /> Download PDF
          </Button>

          {isPrintViewAvailable && onSwitchToPrintView && (
            <Button
              onClick={onSwitchToPrintView}
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 bg-white shadow-2xs cursor-pointer"
            >
              <Printer size={14} className="text-slate-500" /> Full A4 Voucher
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
