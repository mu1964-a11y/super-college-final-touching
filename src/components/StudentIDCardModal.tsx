import * as React from 'react';
import { 
  Printer, 
  Download, 
  CreditCard, 
  School, 
  User, 
  Phone, 
  MapPin 
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { Student } from '../types';

interface StudentIDCardModalProps {
  student: Student | null;
  settings: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudentIDCardModal({
  student,
  settings,
  open,
  onOpenChange
}: StudentIDCardModalProps) {
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const [activeSide, setActiveSide] = React.useState<'both' | 'front' | 'back'>('both');
  const printRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!student) return;
    const verifyId = student.collegeNo || student.id || student.studentId || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://superiorcollegejahanian.com';
    const qrPayload = `${origin}/?verify=card&id=${encodeURIComponent(verifyId)}&roll=${encodeURIComponent(student.collegeNo || '')}`;

    QRCode.toDataURL(qrPayload, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR Code generation error:", err));
  }, [student]);

  const reactToPrintFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Student_ID_Card_${student?.fullName?.replace(/\s+/g, '_') || 'Student'}`,
    onPrintError: () => {
      toast.error("Print dialog failed. Downloading PDF instead...");
      downloadPDF();
    }
  });

  const handlePrint = () => {
    const isIframe = window !== window.parent;
    if (isIframe) {
      toast.info("Direct printing is limited in preview. Downloading high-res PDF...", { duration: 4000 });
      downloadPDF();
    } else {
      reactToPrintFn();
    }
  };

  const downloadPDF = async () => {
    if (!printRef.current || !student) return;
    const toastId = toast.loading("Generating ID Card PDF...");
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Center card on A4 page with safe bounds
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const maxW = pageWidth - 24; // 186mm
      const maxH = pageHeight - 30; // 267mm

      const scale = Math.min(maxW / canvas.width, maxH / canvas.height, 175 / canvas.width);
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`ID_Card_${student.collegeNo || student.id}_${student.fullName.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success("Student ID Card PDF downloaded!");
    } catch (e) {
      console.error(e);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF");
    }
  };

  if (!student) return null;

  const collegeName = settings?.collegeName || "Superior Group of Colleges";
  const campusName = settings?.campusName || "Jahanian Campus";
  const themeColor = settings?.themeColor || "#0b4d45";
  const rollNo = student.collegeNo || student.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-slate-900 text-white">
        {/* Header Modal Bar */}
        <div className="p-6 md:p-8 bg-slate-900/90 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl md:text-2xl font-display font-black tracking-tight uppercase flex items-center gap-2">
                Official Student ID Card
              </DialogTitle>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mt-0.5">
                CR-80 PVC Format · {student.fullName} ({rollNo})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex gap-1">
              <Button
                size="sm"
                variant={activeSide === 'both' ? 'secondary' : 'ghost'}
                onClick={() => setActiveSide('both')}
                className="h-8 text-xs font-black rounded-lg"
              >
                Both Sides
              </Button>
              <Button
                size="sm"
                variant={activeSide === 'front' ? 'secondary' : 'ghost'}
                onClick={() => setActiveSide('front')}
                className="h-8 text-xs font-black rounded-lg"
              >
                Front
              </Button>
              <Button
                size="sm"
                variant={activeSide === 'back' ? 'secondary' : 'ghost'}
                onClick={() => setActiveSide('back')}
                className="h-8 text-xs font-black rounded-lg"
              >
                Back
              </Button>
            </div>

            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-9 rounded-xl border-white/20 text-slate-800 bg-white hover:bg-slate-100 font-black text-xs gap-2"
            >
              <Printer size={14} /> Print Card
            </Button>
            <Button
              onClick={downloadPDF}
              className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 shadow-lg shadow-emerald-900/20"
            >
              <Download size={14} /> Download PDF
            </Button>
          </div>
        </div>

        {/* Card Preview Display Container */}
        <div className="p-6 md:p-10 bg-slate-950/60 overflow-y-auto max-h-[72vh] flex justify-center items-center">
          <div 
            ref={printRef}
            className="p-6 bg-slate-100 rounded-3xl flex flex-wrap gap-8 items-center justify-center print:p-0 print:bg-white print:gap-4 print:shadow-none"
            style={{ width: 'fit-content' }}
          >
            {/* ================= FRONT SIDE ================= */}
            {(activeSide === 'both' || activeSide === 'front') && (
              <div 
                className="w-[336px] h-[520px] bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col justify-between border border-slate-300 print:shadow-none print:border-slate-400"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Top Banner Header */}
                <div 
                  className="relative p-4 pt-5 text-white flex flex-col items-center justify-center text-center overflow-hidden"
                  style={{ backgroundColor: themeColor }}
                >
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="absolute -left-6 -top-6 w-24 h-24 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

                  <div className="w-14 h-14 rounded-full bg-white p-1 shadow-md mb-2 flex items-center justify-center border-2 border-amber-400 shrink-0">
                    {settings?.logo ? (
                      <img src={settings.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                    ) : (
                      <School size={28} className="text-emerald-800" />
                    )}
                  </div>

                  <h2 className="text-[13px] font-black uppercase tracking-wider leading-tight text-white drop-shadow-xs">
                    {collegeName}
                  </h2>
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-amber-300 mt-0.5">
                    {campusName}
                  </p>
                  <div className="h-0.5 w-16 bg-amber-400/60 mt-1.5 rounded-full" />
                </div>

                {/* Photo & Identity Core */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 text-center">
                  {/* Student Photo */}
                  <div className="w-24 h-28 rounded-2xl border-2 border-amber-400/80 bg-slate-50 overflow-hidden shadow-md relative mb-3">
                    {student.photo ? (
                      <img 
                        src={student.photo} 
                        alt={student.fullName} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <User size={36} />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Name & Father Name */}
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight line-clamp-1 leading-tight">
                    {student.fullName}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                    S/D of {student.fatherName || '---'}
                  </p>

                  {/* Roll No Pill */}
                  <div className="mt-2.5 px-3.5 py-1 bg-slate-900 text-white rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Roll #</span>
                    <span className="text-[12px] font-mono font-black text-emerald-400">{rollNo}</span>
                  </div>

                  {/* Academic Details Grid */}
                  <div className="w-full grid grid-cols-2 gap-2 mt-3 text-left bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Class / Group</span>
                      <span className="text-[10px] font-bold text-slate-800 line-clamp-1 block">
                        {student.group || student.category || 'Intermediate'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Section</span>
                      <span className="text-[10px] font-bold text-emerald-700 block">
                        Section {student.section || 'A'} ({student.academicPart || 'Part-1'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Session</span>
                      <span className="text-[10px] font-mono font-black text-slate-700 block">
                        {student.session || '2026-28'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Blood Group</span>
                      <span className="text-[10px] font-black text-rose-600 block">
                        {student.bloodGroup || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div 
                  className="px-4 py-2 text-white flex items-center justify-between text-[8px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: themeColor }}
                >
                  <span className="text-white/80">STUDENT IDENTITY CARD</span>
                  <span className="text-amber-300">VALID UP TO 2028</span>
                </div>
              </div>
            )}

            {/* ================= BACK SIDE ================= */}
            {(activeSide === 'both' || activeSide === 'back') && (
              <div 
                className="w-[336px] h-[520px] bg-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col justify-between border border-slate-300 p-5 print:shadow-none print:border-slate-400"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Back Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                        <School size={16} />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-slate-900 leading-tight">
                          {collegeName}
                        </h4>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                          {campusName}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-none text-[8px] font-black uppercase tracking-wider">
                      Verified
                    </Badge>
                  </div>

                  {/* Demographic Details */}
                  <div className="space-y-2 text-[10px] text-slate-700">
                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <Phone size={13} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Guardian Helpline / Emergency</span>
                        <span className="font-bold text-slate-900">{student.fatherContact || student.contact || settings?.contactNumber || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Permanent Residence</span>
                        <span className="font-medium text-slate-800 line-clamp-2">{student.address || 'Jahanian, Punjab, Pakistan'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">B-Form / CNIC</span>
                        <span className="font-mono font-bold text-slate-800 text-[9px]">{student.bayFormNo || '---'}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">System ID</span>
                        <span className="font-mono font-bold text-slate-800 text-[9px]">{student.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-3 p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[8.5px] text-amber-900/90 leading-relaxed font-medium">
                    <p className="font-black uppercase tracking-wider text-amber-950 mb-0.5">Cardholder Instructions:</p>
                    <ul className="list-disc pl-3 space-y-0.5">
                      <li>Must be displayed visibly at all times within college premises.</li>
                      <li>Non-transferable. Misuse is subject to disciplinary action.</li>
                      <li>If found, please return to College Admin Office or call <strong>{settings?.contactNumber || 'Helpline'}</strong>.</li>
                    </ul>
                  </div>
                </div>

                {/* Footer with QR Code & Principal Stamp */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR" className="w-14 h-14 border border-slate-200 rounded-lg p-0.5" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 rounded-lg" />
                    )}
                    <div className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>SCAN TO VERIFY</span><br />
                      <span className="text-slate-600 font-mono">PORTAL SYNC</span>
                    </div>
                  </div>

                  <div className="text-center w-28">
                    <div className="h-6 flex items-center justify-center">
                      <span className="font-serif italic font-black text-[12px] text-slate-700 tracking-wider">
                        {settings?.principalName || 'Principal'}
                      </span>
                    </div>
                    <div className="h-0.5 w-full bg-slate-800 mb-0.5"></div>
                    <span className="text-[7.5px] font-black uppercase tracking-widest text-slate-500">
                      Issuing Authority
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Close bar */}
        <div className="p-4 bg-slate-900 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
          <span>Dimensions: Standard CR-80 PVC (85.6mm × 53.98mm)</span>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10 rounded-xl">
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
