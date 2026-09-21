import * as React from 'react';
import { 
  Printer, 
  Download, 
  CreditCard, 
  School, 
  User, 
  Phone, 
  MapPin,
  Shield,
  CheckCircle2,
  Sparkles,
  QrCode as QrIcon,
  Award
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateBrandedQrCode } from '../lib/brandedQrCode';
import { useReactToPrint } from 'react-to-print';
import { exportElementToPdf, exportElementToImage } from '../utils/documentExporter';

export type IDCardType = 'student' | 'staff' | 'admin';

export interface IDCardEntity {
  type: IDCardType;
  fullName: string;
  fatherName?: string;
  idNumber: string; // Roll No, Staff ID, or Admin ID
  categoryOrRole: string; // e.g. "FSc Pre-Engineering" or "Lecturer (Computer Science)" or "Super Admin"
  subCategory?: string; // e.g. "Section MEPB" or "Computer Science Dept" or "Clearance: Level-1"
  sessionOrValidity?: string; // e.g. "2026-28" or "2026-2027"
  bloodGroup?: string;
  contact?: string;
  emergencyContact?: string;
  cnicOrBForm?: string;
  photo?: string;
  qualification?: string;
  email?: string;
  address?: string;
}

export interface ExecutiveIDCardModalProps {
  entity: IDCardEntity | null;
  settings?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExecutiveIDCardModal({
  entity,
  settings,
  open,
  onOpenChange
}: ExecutiveIDCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const printRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!entity) return;
    const verifyId = entity.idNumber || '';
    const origin = typeof window !== 'undefined' && window.location?.origin && window.location.protocol !== 'file:' 
      ? window.location.origin 
      : 'https://portal.superiorjhn.com';
    const qrPayload = `${origin}/?verify=card&id=${encodeURIComponent(verifyId)}&type=${encodeURIComponent(entity.type)}`;

    generateBrandedQrCode(qrPayload, {
      size: 260,
      logoUrl: '/superior-logo.png',
      darkColor: '#08332c',
      lightColor: '#ffffff',
      includeGoldBorder: true,
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR Code generation error:", err));
  }, [entity]);

  const reactToPrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${entity?.type?.toUpperCase() || 'ID'}_Card_${entity?.fullName?.replace(/\s+/g, '_') || 'Member'}`,
    onPrintError: () => {
      toast.error("Print dialog failed. Downloading high-res PNG instead...");
      downloadPNG();
    }
  });

  const handlePrint = () => {
    const isIframe = typeof window !== 'undefined' && window !== window.parent;
    if (isIframe) {
      toast.info("Direct print restricted in preview frame. Downloading high-res PNG...", { duration: 4000 });
      downloadPNG();
    } else {
      reactToPrintFn();
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current || !entity) return;
    const toastId = toast.loading("Generating Single-Side ID Card PDF...");
    try {
      await exportElementToPdf(printRef.current, {
        filename: `${entity.type}_Card_${entity.idNumber}_${entity.fullName.replace(/\s+/g, '_')}`,
        format: 'a4',
        orientation: 'portrait',
        pixelRatio: 3.0,
        backgroundColor: '#ffffff',
        marginMm: 10,
      });
      toast.dismiss(toastId);
      toast.success("Executive ID Card PDF downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF");
    }
  };

  const downloadPNG = async () => {
    if (!printRef.current || !entity) return;
    const toastId = toast.loading("Exporting Card as High-Resolution Image (300 DPI)...");
    try {
      await exportElementToImage(
        printRef.current,
        `${entity.type}_Card_${entity.idNumber}_${entity.fullName.replace(/\s+/g, '_')}.png`,
        { pixelRatio: 3.5, backgroundColor: '#ffffff' }
      );
      toast.dismiss(toastId);
      toast.success("High-Res ID Card Image downloaded!");
    } catch (e) {
      console.error(e);
      toast.dismiss(toastId);
      toast.error("Failed to download image");
    }
  };

  if (!entity) return null;

  const collegeName = "SUPERIOR COLLEGE JAHANIAN";
  const campusAddress = "Canal Road, Jahanian";
  const helplinePhone = "0301-4455891";
  const logo = settings?.logo;

  // Theme styling based on entity type
  const isStudent = entity.type === 'student';
  const isStaff = entity.type === 'staff';
  const isAdmin = entity.type === 'admin';

  const badgeTitle = isStudent 
    ? "STUDENT IDENTITY CARD" 
    : isStaff 
      ? "FACULTY IDENTITY CARD" 
      : "EXECUTIVE ADMINISTRATION PASS";

  const headerGradient = isStudent
    ? "bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#04332c]"
    : isStaff
      ? "bg-gradient-to-r from-[#0b4d45] via-[#083a34] to-[#052622]"
      : "bg-gradient-to-r from-[#0f172a] via-[#022c22] to-[#085a4e]";

  const accentColor = isStudent ? "#cfa84c" : isStaff ? "#eab308" : "#f59e0b";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white">
        {/* Header Modal Bar */}
        <div className="p-6 md:p-7 bg-slate-900/90 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
              <CreditCard size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-display font-black tracking-tight uppercase flex items-center gap-2">
                Official Single-Side ID Card
              </DialogTitle>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">
                Standard CR-80 PVC Format · {entity.fullName} ({entity.idNumber})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-10 px-4 rounded-xl border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-black text-xs gap-2 shadow-sm active:scale-95 transition-all"
            >
              <Printer size={15} /> Print Card
            </Button>
            <Button
              onClick={downloadPNG}
              variant="outline"
              className="h-10 px-4 rounded-xl border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-black text-xs gap-2 shadow-sm active:scale-95 transition-all"
              title="Download 300 DPI High-Res Image for PVC Printing"
            >
              <Download size={15} /> PNG (High-Res)
            </Button>
            <Button
              onClick={downloadPDF}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Download size={15} /> PDF
            </Button>
          </div>
        </div>

        {/* Card Viewport Container */}
        <div className="p-6 md:p-10 bg-slate-950/80 overflow-y-auto max-h-[75vh] flex justify-center items-center">
          <div 
            ref={printRef}
            className="p-4 sm:p-6 bg-slate-100 rounded-[28px] flex items-center justify-center print:p-0 print:bg-white print:shadow-none"
            style={{ width: 'fit-content' }}
          >
            {/* ================= ULTRA PREMIUM SINGLE-SIDED CARD ================= */}
            <div 
              className="w-[340px] h-[535px] bg-white rounded-[24px] shadow-2xl overflow-hidden relative flex flex-col justify-between border-2 border-[#cfa84c]/50 print:shadow-none print:border-[#cfa84c]"
              style={{ 
                width: '340px', 
                height: '535px', 
                minWidth: '340px', 
                minHeight: '535px', 
                fontFamily: "'Inter', sans-serif" 
              }}
            >
              {/* Background Watermark Crest */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
                <School size={280} className="text-[#085a4e]" />
              </div>

              {/* ─── 1. TOP HEADER BANNER ─── */}
              <div className={`relative px-4 pt-4 pb-3 text-white flex flex-col items-center justify-center text-center overflow-hidden shrink-0 ${headerGradient}`}>
                {/* Decorative Metallic Corner Rings */}
                <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-8 -top-8 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f3d274] to-transparent" />

                {/* College Crest Logo in Gold Ring */}
                <div 
                  className="w-13 h-13 rounded-full bg-white p-1 shadow-md mb-1.5 flex items-center justify-center border-2 border-[#f3d274] shrink-0 overflow-hidden"
                  style={{ width: '52px', height: '52px', minWidth: '52px', minHeight: '52px', clipPath: 'circle(49% at 50% 50%)' }}
                >
                  {logo ? (
                    <img 
                      src={logo} 
                      alt="Logo" 
                      className="w-full h-full object-contain rounded-full" 
                      style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                      width={44}
                      height={44}
                    />
                  ) : (
                    <School size={26} className="text-[#085a4e]" />
                  )}
                </div>

                {/* College Title */}
                <h2 className="text-[13px] font-black uppercase tracking-wider leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                  {collegeName}
                </h2>
                <p className="text-[8.5px] font-black uppercase tracking-[0.25em] text-[#f3d274] mt-0.5">
                  {campusAddress}
                </p>

                {/* Card Type Badge Ribbon */}
                <div className="mt-1.5 px-3 py-0.5 bg-black/30 border border-[#f3d274]/50 rounded-full shadow-inner flex items-center gap-1.5">
                  <Sparkles size={8} className="text-[#f3d274]" />
                  <span className="text-[7.5px] font-black tracking-[0.15em] text-white uppercase">
                    {badgeTitle}
                  </span>
                  <Sparkles size={8} className="text-[#f3d274]" />
                </div>
              </div>

              {/* ─── 2. PORTRAIT & IDENTITY SECTION ─── */}
              <div className="flex-1 flex flex-col items-center justify-between px-3.5 py-2 text-center relative z-10">
                {/* Circular Photo with Executive Gold Frame & Verification Hologram (Face Focused) */}
                <div 
                  className="w-22 h-22 rounded-full border-2 border-[#cfa84c] p-0.5 bg-gradient-to-tr from-[#cfa84c] via-[#f3d274] to-[#a8822d] shadow-md relative shrink-0 mt-0.5 flex items-center justify-center"
                  style={{ width: '88px', height: '88px', minWidth: '88px', minHeight: '88px' }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 relative">
                    {entity.photo ? (
                      <img 
                        src={entity.photo} 
                        alt={entity.fullName} 
                        className="w-full h-full object-cover object-[center_top] rounded-full" 
                        referrerPolicy="no-referrer"
                        width={88}
                        height={88}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 rounded-full">
                        <User size={32} className="text-slate-300" />
                        <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-400 mt-0.5">NO PHOTO</span>
                      </div>
                    )}
                  </div>

                  {/* Verified Holographic Green Badge */}
                  <div className="absolute bottom-0 right-0 bg-emerald-600 text-white rounded-full p-0.5 shadow-md border border-white z-10">
                    <CheckCircle2 size={11} strokeWidth={3} />
                  </div>
                </div>

                {/* Member Full Name - Bold & Prominent */}
                <div className="mt-2 w-full">
                  <h3 className="text-base sm:text-[17px] font-black text-slate-950 uppercase tracking-tight leading-tight line-clamp-1">
                    {entity.fullName}
                  </h3>
                  {entity.fatherName && (
                    <p className="text-[11px] font-extrabold text-slate-800 truncate mt-0.5">
                      s/o {entity.fatherName}
                    </p>
                  )}
                  {entity.qualification && (
                    <p className="text-[9.5px] font-black text-emerald-800 truncate mt-0.5">
                      {entity.qualification}
                    </p>
                  )}
                </div>

                {/* Prominent High-Contrast ID Pill */}
                <div className="my-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#064e43] to-[#0a6659] text-white shadow-sm border-2 border-[#f3d274]">
                  <span className="text-[9px] font-black tracking-widest text-[#f3d274] uppercase">
                    {isStudent ? "ROLL NO:" : isStaff ? "STAFF ID:" : "ADMIN ID:"}
                  </span>
                  <span className="text-[12px] font-mono font-black tracking-wider text-white">
                    {entity.idNumber}
                  </span>
                </div>

                {/* ─── 3. MICRO DATA GRID (6 Badges) - Bold & Wazeh ─── */}
                <div className="w-full grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-300/80 rounded-xl p-2 shadow-2xs text-left">
                  <div className="px-1 border-r border-slate-200">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                      {isStudent ? "Program" : "Department"}
                    </span>
                    <span className="text-[10px] font-black text-slate-900 truncate block leading-tight">
                      {entity.categoryOrRole}
                    </span>
                  </div>

                  <div className="px-1 border-r border-slate-200">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                      {isStudent ? "Section" : "Designation"}
                    </span>
                    <span className="text-[10px] font-black text-[#064e43] truncate block leading-tight">
                      {entity.subCategory || "General"}
                    </span>
                  </div>

                  <div className="px-1">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                      {isStudent ? "Session" : "Validity"}
                    </span>
                    <span className="text-[10px] font-mono font-black text-slate-900 block leading-tight">
                      {entity.sessionOrValidity || "2026-28"}
                    </span>
                  </div>

                  <div className="px-1 pt-1.5 border-t border-slate-200 border-r">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Blood Grp</span>
                    <span className="text-[10.5px] font-black text-rose-600 block leading-tight">
                      {entity.bloodGroup || "---"}
                    </span>
                  </div>

                  <div className="px-1 pt-1.5 border-t border-slate-200 border-r">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">
                      {isStudent ? "B-Form / CNIC" : "CNIC No"}
                    </span>
                    <span className="text-[9px] font-mono font-black text-slate-900 truncate block leading-tight">
                      {entity.cnicOrBForm || "---"}
                    </span>
                  </div>

                  <div className="px-1 pt-1.5 border-t border-slate-200">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">Emergency</span>
                    <span className="text-[9px] font-mono font-black text-slate-900 truncate block leading-tight">
                      {entity.emergencyContact || entity.contact || helplinePhone}
                    </span>
                  </div>
                </div>

                {/* ─── 4. SECURITY VERIFICATION & SIGNATURE DOCK ─── */}
                <div className="w-full flex items-center justify-between gap-2 mt-1 px-1">
                  {/* Realtime QR Code */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-2xs">
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="QR Code" 
                          className="w-13 h-13" 
                          style={{ width: '52px', height: '52px' }}
                          width={52}
                          height={52}
                        />
                      ) : (
                        <div className="w-13 h-13 bg-slate-100 flex items-center justify-center">
                          <QrIcon size={24} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-left leading-none">
                      <span className="text-[6.5px] font-black uppercase tracking-wider text-emerald-800 block">
                        Scan to
                      </span>
                      <span className="text-[6.5px] font-black uppercase tracking-wider text-emerald-800 block">
                        Verify
                      </span>
                    </div>
                  </div>

                  {/* Official Metallic Seal Medallion */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="w-11 h-11 rounded-full border-2 border-dashed border-[#cfa84c] flex flex-col items-center justify-center text-[#cfa84c] p-0.5 shadow-2xs bg-amber-50/50">
                      <Award size={14} className="text-[#cfa84c]" />
                      <span className="text-[5.5px] font-black tracking-tighter uppercase text-[#967425] leading-none mt-0.5">
                        SEAL
                      </span>
                    </div>
                    <span className="text-[5.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      OFFICIAL
                    </span>
                  </div>

                  {/* Authorized Signatory Line */}
                  <div className="flex flex-col items-center justify-end text-center shrink-0">
                    {/* Calligraphy Signature Stroke Simulation */}
                    <div className="h-6 flex items-end justify-center mb-0.5">
                      <svg width="60" height="22" viewBox="0 0 70 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 18C12 8 20 22 28 10C32 4 36 18 42 8C48 18 56 12 66 14" stroke="#064e43" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 14C34 14 44 20 54 20" stroke="#064e43" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="w-20 h-[1px] bg-slate-400" />
                    <span className="text-[6.5px] font-black uppercase tracking-widest text-slate-700 mt-0.5">
                      Principal
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── 5. BOTTOM FOOTER STRIP ─── */}
              <div className={`px-3 py-1.5 text-white flex items-center justify-between text-[7px] font-black uppercase tracking-wider shrink-0 ${headerGradient} border-t border-[#f3d274]/40`}>
                <div className="flex items-center gap-1 text-slate-200">
                  <MapPin size={9} className="text-[#f3d274]" />
                  <span>{campusAddress}</span>
                </div>
                <div className="flex items-center gap-1 text-[#f3d274]">
                  <Phone size={9} />
                  <span>{helplinePhone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
