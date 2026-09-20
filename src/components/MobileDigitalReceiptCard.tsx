import * as React from 'react';
import { useRef, useState } from 'react';
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
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Award,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportElementToImage, exportElementToPdf } from '../utils/documentExporter';
import { toast } from 'sonner';

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
  collegeLogo,
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
  const [showOrderDetails, setShowOrderDetails] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const std = student || {};
  const currentVerifiedAt = verifiedAt || new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
  const displayReceiptId = receiptNo || matchedTx?.receipt_id || matchedTx?.receiptId || `REC-BOT-${(std.rollNo || std.id || '101').replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`;
  
  // Specific receipt amounts
  const receiptAmount = matchedTx ? Number(matchedTx.amount || matchedTx.amountPaid || 0) : (feeReceivedAmount > 0 ? feeReceivedAmount : 15000);
  const paymentMethod = matchedTx?.payment_method || matchedTx?.paymentMethod || (std.reference?.toLowerCase().includes('whatsapp') ? 'WhatsApp Bot' : 'Campus Accounts Cash');
  const recordedBy = matchedTx?.recorded_by || matchedTx?.collectedBy || (std.reference?.toLowerCase().includes('whatsapp') ? `WhatsApp Bot (${std.reference.replace(/via whatsapp bot/i, '').replace(/[()]/g, '').trim() || 'Sub-Admin Ahmad'})` : 'Campus Accounts Desk');

  const isBotTransaction = paymentMethod.toLowerCase().includes('bot') || recordedBy.toLowerCase().includes('bot') || (std.reference || '').toLowerCase().includes('whatsapp');

  // Title and subtitle depending on document type
  const getHeaderInfo = () => {
    switch (type) {
      case 'receipt':
        return {
          title: 'Transaction Successful',
          badgeText: 'Payment Verified',
          subtitle: 'Money has been received & verified',
          totalLabel: 'Total Amount Received',
          totalValue: receiptAmount,
        };
      case 'admission':
        return {
          title: 'Admission Confirmed!',
          badgeText: 'Enrolment Verified',
          subtitle: 'Official admission recorded in LMS database',
          totalLabel: 'Initial Fee Deposited',
          totalValue: std.admissionFee || feeReceivedAmount || receiptAmount,
        };
      case 'statement':
      case 'challan':
        return {
          title: 'Fee Ledger Verified',
          badgeText: 'Account Cleared',
          subtitle: 'Official financial audit record',
          totalLabel: 'Total Fee Cleared',
          totalValue: feeReceivedAmount,
        };
      case 'result':
        return {
          title: 'Examination Verified',
          badgeText: 'Result Authenticated',
          subtitle: 'Academic assessment certified by Examination Board',
          totalLabel: 'Percentage',
          totalValue: 0,
        };
      case 'attendance':
        return {
          title: 'Attendance Verified',
          badgeText: 'Punctuality Authenticated',
          subtitle: 'Classroom biometric log record',
          totalLabel: 'Present Days',
          totalValue: 0,
        };
      default:
        return {
          title: 'Document Verified',
          badgeText: 'Official Original',
          subtitle: 'Record verified in College Database',
          totalLabel: 'Fee Balance',
          totalValue: feeReceivedAmount,
        };
    }
  };

  const headerInfo = getHeaderInfo();

  // Handle Share (Native Web Share API or WhatsApp link)
  const handleShare = async () => {
    setIsSharing(true);
    const origin = typeof window !== 'undefined' ? window.location.href : 'https://portal.superiorjhn.com';
    const shareText = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
🧾 *OFFICIAL DIGITAL VERIFICATION RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Student:* ${std.fullName || 'Student'} (${std.rollNo || std.id || ''})
• *Class:* ${std.group || std.category || 'Intermediate'} (Sec ${std.section || 'A'})
• *Status:* ✅ ${headerInfo.title}
• *Amount:* Rs. ${receiptAmount.toLocaleString()}
• *Channel:* ${paymentMethod}
• *Receipt No:* #${displayReceiptId}
• *Date:* ${currentVerifiedAt}
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
        // Fallback to WhatsApp
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
      const filename = `SGC_Receipt_${(std.fullName || 'Student').replace(/\s+/g, '_')}_${displayReceiptId}`;
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
      const filename = `SGC_Receipt_${(std.fullName || 'Student').replace(/\s+/g, '_')}_${displayReceiptId}`;
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
    <div className="w-full max-w-[440px] mx-auto py-2 px-3 sm:px-0">
      {/* ======================================================== */}
      {/* CAPTURABLE RECEIPT CARD ROOT (Pure Mobile-First Aesthetic) */}
      {/* ======================================================== */}
      <div 
        ref={cardRef}
        id="mobile-digital-receipt-canvas"
        className="bg-white rounded-[28px] border border-slate-200/90 shadow-2xl p-6 sm:p-7 relative overflow-hidden select-none"
        style={{ colorScheme: 'light', color: '#0f172a' }}
      >
        {/* Subtle Institutional Watermark Pattern */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.025] flex items-center justify-center select-none"
          style={{ backgroundImage: 'radial-gradient(#085a4e 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        {/* ======================================================== */}
        {/* 1. TOP METALLIC 3D GOLDEN MEDALLION WITH VIBRANT CHECKMARK */}
        {/* Exact match to Easypaisa reference screenshot */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center justify-center text-center pt-2 pb-1 relative z-10">
          <div className="relative mb-3.5">
            {/* Ambient Glow */}
            <div className="absolute inset-0 rounded-full bg-[#d4af37]/25 blur-xl scale-125 pointer-events-none" />
            
            {/* 3D Gold Rim Medallion */}
            <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full p-[3px] bg-gradient-to-b from-[#d5b056] via-[#f7e096] to-[#b48d34] shadow-[0_10px_25px_rgba(180,141,52,0.4)] flex items-center justify-center relative">
              {/* Inner Medallion Plate */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#cf9d34] via-[#e8c66e] to-[#ebd281] flex items-center justify-center border-2 border-white/40 shadow-inner">
                {/* 3D Vibrant Green Checkmark */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
                  <Check 
                    size={38} 
                    className="text-[#10b981] stroke-[4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl sm:text-[25px] font-black tracking-tight text-slate-800 leading-tight">
            {headerInfo.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
            {headerInfo.subtitle}
          </p>
        </div>

        {/* ======================================================== */}
        {/* 2. QUICK 4-COLUMN STATS STRIP (Reference Image 2 Style) */}
        {/* ======================================================== */}
        <div className="bg-slate-50/90 rounded-2xl border border-slate-200/80 p-3.5 my-4 relative z-10">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2.5">
            <span className="text-xs font-black text-slate-800 tracking-tight">
              {std.group || std.category || 'Intermediate (F.Sc)'}
            </span>
            <Badge className="bg-[#085a4e]/10 text-[#085a4e] border-[#085a4e]/20 text-[10px] font-bold px-2 py-0.5">
              {std.session || 'Session 2026-28'}
            </Badge>
          </div>

          {/* 4-Column Icon Metrics */}
          <div className="grid grid-cols-4 gap-1 text-center">
            {/* Metric 1: Total Package */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <Wallet size={14} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Total Pkg</span>
              <span className="text-[11px] font-black text-slate-800 font-mono mt-0.5">
                Rs. {(totalPackageAmount || 60000).toLocaleString()}
              </span>
            </div>

            {/* Metric 2: Paid Amount */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
                <Coins size={14} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Total Paid</span>
              <span className="text-[11px] font-black text-emerald-600 font-mono mt-0.5">
                Rs. {(feeReceivedAmount || receiptAmount).toLocaleString()}
              </span>
            </div>

            {/* Metric 3: Remaining Balance */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-1">
                <Clock size={14} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Remaining</span>
              <span className="text-[11px] font-black text-rose-600 font-mono mt-0.5">
                Rs. {remainingBalanceAmount.toLocaleString()}
              </span>
            </div>

            {/* Metric 4: Status / Section */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
                <CheckCircle2 size={14} />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block">Section</span>
              <span className="text-[11px] font-black text-slate-800 mt-0.5">
                {std.section ? `Sec ${std.section}` : 'Sec A'}
              </span>
            </div>
          </div>

          {/* Verification Status Pill */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
            <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
              <Check size={11} className="stroke-[3]" /> Verified in College DB
            </span>
            {isBotTransaction && (
              <span className="font-bold text-slate-500">
                🤖 Via WhatsApp Bot
              </span>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. DETAILED ORDER / TRANSACTION DOSSIER (Image 1 Style) */}
        {/* ======================================================== */}
        <div className="space-y-3.5 relative z-10 text-[13px]">
          {/* Transaction Metadata */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Transaction ID</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                #{displayReceiptId}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Date & Time</span>
              <span className="font-medium text-slate-800 text-right">
                {currentVerifiedAt}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Funding Source</span>
              <span className="font-bold text-slate-900 text-right flex items-center gap-1">
                {isBotTransaction ? (
                  <span className="text-emerald-700 font-black">
                    WhatsApp Bot Account
                  </span>
                ) : (
                  <span>{paymentMethod}</span>
                )}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200/80 my-3" />

          {/* Student Particulars (Sent to) */}
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Sent to (Student Particulars)
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Name</span>
                <span className="font-bold text-slate-900 text-right uppercase">
                  {std.fullName || 'Student'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Roll No / College ID</span>
                <span className="font-mono font-black text-[#085a4e] text-right">
                  {std.rollNo || std.collegeNo || std.id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Father Name</span>
                <span className="font-medium text-slate-800 text-right">
                  {std.fatherName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Program & Class</span>
                <span className="font-medium text-slate-800 text-right">
                  {std.group || std.category || 'F.Sc'} {std.section ? `(Sec ${std.section})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 my-3" />

          {/* Depositor & Operator (Sent by) */}
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Sent by (Depositor & Authority)
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Depositor Name</span>
                <span className="font-bold text-slate-900 text-right">
                  {std.fatherName || 'Parent / Guardian'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Contact Number</span>
                <span className="font-mono font-medium text-slate-800 text-right">
                  {std.fatherContact || std.contact || '03036296660'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Authorized Operator</span>
                <span className="font-bold text-emerald-800 text-right text-xs">
                  {recordedBy}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/80 my-3" />

          {/* Financial Breakdown (Charges) */}
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              Charges & Breakdown
            </span>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Amount Received</span>
                <span className="font-mono font-bold text-slate-900 text-right">
                  Rs. {receiptAmount.toLocaleString()}.00
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Processing Fee / Charges</span>
                <span className="font-mono font-medium text-slate-800 text-right">
                  Rs. 0.00
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Remaining Unpaid Dues</span>
                <span className="font-mono font-bold text-rose-600 text-right">
                  Rs. {remainingBalanceAmount.toLocaleString()}.00
                </span>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-slate-900/10 my-3.5" />

          {/* Prominent Large Total Amount Row */}
          <div className="flex justify-between items-center py-1">
            <span className="text-base font-bold text-slate-900">Total Amount</span>
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              Rs. {receiptAmount.toLocaleString()}.00
            </span>
          </div>

          <div className="border-t border-slate-200/80 my-4" />

          {/* ======================================================== */}
          {/* 4. FOOTER: VERIFIED BY COLLEGE BRANDING (Image 1 Style) */}
          {/* ======================================================== */}
          <div className="pt-2 text-center flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Verified & Certified By
            </span>

            <div className="flex items-center gap-2.5 justify-center">
              <div className="w-8 h-8 rounded-full bg-white p-0.5 border border-[#c9a84c] shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                {collegeLogo ? (
                  <img src={collegeLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                ) : (
                  <School size={18} className="text-[#085a4e]" />
                )}
              </div>
              <div className="text-left">
                <span className="font-black text-xs text-[#085a4e] block leading-tight font-serif uppercase tracking-tight">
                  {collegeName}
                </span>
                <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">
                  Official Accounts & AI Registry • Code: 3014
                </span>
              </div>
            </div>

            {/* Verification Security Watermark */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between w-full text-[9px] text-slate-400 font-mono">
              <span>REF: {displayReceiptId}</span>
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <ShieldCheck size={10} /> 100% Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. FLOATING MOBILE ACTIONS BAR (Reference Image 2 Style) */}
      {/* ======================================================== */}
      <div className="mt-4 flex flex-col gap-2.5 print-hide">
        {/* Main 2-Button Row (Share & Download Image) */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="h-12 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98"
          >
            <Share2 size={16} className="text-blue-600" />
            <span>Share</span>
          </Button>

          <Button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="h-12 rounded-2xl bg-[#085a4e] hover:bg-[#064e43] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
          >
            <Download size={16} className="text-[#f7e096]" />
            <span>Save Image</span>
          </Button>
        </div>

        {/* Secondary Actions (Download PDF & Switch to Physical Voucher) */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 bg-white shadow-2xs"
          >
            <FileDown size={14} className="text-rose-600" /> Download PDF
          </Button>

          {isPrintViewAvailable && onSwitchToPrintView && (
            <Button
              onClick={onSwitchToPrintView}
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-[11px] flex items-center justify-center gap-1.5 bg-white shadow-2xs"
            >
              <Printer size={14} className="text-slate-500" /> Full A4 Voucher
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
