
import * as React from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  Download, 
  School, 
  User, 
  CreditCard, 
  Plus, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Admission } from '../types';

export default function AdmissionSlip({ admission, settings }: { admission: Admission | any, settings: any }) {
  const slipRef = React.useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (!admission) return;
    const qrPayload = `SUPERIOR COLLEGE JAHANIAN - OFFICIAL ADMISSION\n` +
      `Name: ${admission.fullName}\n` +
      `Roll No: ${admission.collegeNo || admission.studentId || 'N/A'}\n` +
      `Group: ${admission.group || 'N/A'}\n` +
      `Section: ${admission.section || 'A'}\n` +
      `Session: ${admission.session || settings?.academicSession || '2026-28'}\n` +
      `Total Package: Rs. ${admission.totalPackage || 0}\n` +
      `Received: Rs. ${admission.feeReceived || 0}\n` +
      `Balance: Rs. ${(admission.totalPackage || 0) - (admission.feeReceived || 0)}`;

    QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(setQrCodeUrl).catch(console.error);
  }, [admission, settings]);

  const getProgramInfo = () => {
    const group = (admission.group || admission.category || '').toLowerCase();
    
    if (group.includes('uk') || group.includes('level 3')) {
      return {
        name: 'UK LEVEL 3',
        theme: '#1e40af', // Blue
        secondary: '#60a5fa',
        isSemester: true
      };
    }
    if (group.includes('dit')) {
      return {
        name: 'D.I.T',
        theme: '#065f46', // Emerald
        secondary: '#34d399',
        isSemester: true
      };
    }
    if (group.includes('bs')) {
      return {
        name: 'B.S PROGRAM',
        theme: '#9f1239', // Rose/Maroon
        secondary: '#fb7185',
        isSemester: true
      };
    }
    // Default / F.Sc (Inter)
    return {
      name: 'INTERMEDIATE',
      theme: settings?.themeColor || '#0b4d45', // Superior Teal
      secondary: '#d4af37', // Gold
      isSemester: false
    };
  };

  const prog = getProgramInfo();

  const downloadSlip = async () => {
    if (!slipRef.current) return;
    const toastId = toast.loading("Generating High-Fidelity Slip...");
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Safe 6mm margin around document
      const margin = 6;
      const maxW = pageWidth - (margin * 2); // 198mm
      const maxH = pageHeight - (margin * 2); // 285mm

      // Proportional aspect-ratio fit to ensure 100% of header, content, QR & signatures fit on page
      const ratioW = maxW / imgProps.width;
      const ratioH = maxH / imgProps.height;
      const scale = Math.min(ratioW, ratioH);

      const finalW = imgProps.width * scale;
      const finalH = imgProps.height * scale;

      // Perfectly center horizontally & vertically on A4 page
      const x = (pageWidth - finalW) / 2;
      const y = (pageHeight - finalH) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, finalW, finalH);
      pdf.save(`Admission_Slip_${admission.fullName?.replace(/\s+/g, '_') || 'Student'}.pdf`);
      toast.dismiss(toastId);
      toast.success("Admission Slip downloaded!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to download slip");
    }
  };

  const reactToPrintFn = useReactToPrint({
    contentRef: slipRef,
    documentTitle: `Admission_Slip_${admission.fullName?.replace(/\s+/g, '_') || 'Applicant'}`,
    onPrintError: (error) => {
      console.error(error);
      toast.error("Printing failed. Using download fallback.");
      downloadSlip();
    }
  });

  const handlePrintClick = () => {
    try {
      const isIframe = window !== window.parent;
      if (isIframe) {
        toast.info("Direct printing is blocked in Preview Mode. To use Print, please click 'Open App in New Tab' (top right corner). Downloading PDF fallback...", { duration: 6000 });
        downloadSlip();
      } else {
        reactToPrintFn();
      }
    } catch (e) {
      toast.info("Attempting PDF download fallback...");
      downloadSlip();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
        <h3 className="text-xl font-serif font-bold text-superior-teal">Admission Form Preview</h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrintClick} className="rounded-xl font-bold">
            Print
          </Button>
          <Button className="bg-superior-teal text-white font-black rounded-xl hover:bg-superior-teal/90" onClick={downloadSlip}>
            Download PDF Legal
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 bg-slate-100 flex justify-center preview-scroll-container">
        <div 
          ref={slipRef}
          className="w-[794px] min-h-[1123px] h-fit bg-white px-8 py-7 relative shadow-2xl overflow-hidden print-area flex flex-col justify-between"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-0">
            <div className="w-full flex items-center justify-center gap-6 mb-1">
               <div className="w-18 h-18 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0">
                {settings?.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <School size={36} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tighter whitespace-nowrap uppercase mb-0" style={{ color: settings?.themeColor || '#0b4d45' }}>{settings?.collegeName || 'Superior College Jahanniah'}</h1>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                   <span>Email: {settings?.email || 'N/A'}</span>
                   <span className="opacity-50">|</span>
                   <span>Contact: {settings?.contactNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="w-full border-b pb-2 flex flex-col items-center gap-1" style={{ borderColor: prog.theme + '20' }}>
              <div className="flex items-center gap-3">
                <p className="text-xl font-black uppercase tracking-[0.3em] text-slate-800 leading-none" style={{ color: prog.theme }}>OFFICIAL ADMISSION SLIP</p>
                {admission.concessionReason && (
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                    ★ {admission.concessionReason} Scholarship
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
                <span className="text-[10px] font-mono font-black text-slate-500">STUDENT ID: <span style={{ color: prog.theme }}>{admission.studentId || (admission as any).id || 'PENDING'}</span></span>
                <span className="text-[10px] font-mono font-black text-slate-500">ROLL NO: <span className="text-emerald-700 font-bold">{admission.collegeNo || 'UNASSIGNED'}</span></span>
                <span className="text-[10px] font-mono font-black text-slate-500">SECTION: <span style={{ color: prog.theme }}>{admission.section || 'A'}</span></span>
                <span className="text-[10px] font-mono font-black text-slate-500">SESSION: <span style={{ color: prog.theme }}>{admission.session || settings?.academicSession || '2026-28'}</span></span>
                <span className="text-[10px] font-mono font-black text-slate-500">DATE: <span style={{ color: prog.theme }}>{admission.date}</span></span>
              </div>
            </div>
          </div>

          {/* Student Info Section */}
          <section className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-3 shadow-sm mt-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-3 border-b border-slate-200 pb-1" style={{ color: prog.theme }}>Student Profile & Demographics</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-10 space-y-3">
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-6">
                  {[
                    { label: "Student Full Name", value: admission.fullName },
                    { label: "Father's Name", value: admission.fatherName },
                    { label: "B-Form / CNIC", value: admission.bayFormNo },
                    { label: "Date of Birth", value: admission.dob },
                    { label: "Contact (Primary)", value: admission.contactNumber || admission.contact },
                    { label: "Father's Contact", value: admission.fatherContact },
                    { label: "Secondary Contact", value: admission.secondaryContact },
                    { label: "Gender", value: admission.gender },
                    { label: "Email Address", value: (admission as any).email },
                    { label: "Blood Group", value: (admission as any).bloodGroup }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-widest">{item.label}</p>
                      <p className="text-[12.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-tight min-h-[20px]">
                        {item.value && item.value !== '---' ? item.value : '\u00A0'}
                      </p>
                    </div>
                  ))}
                  <div className="space-y-0.5 col-span-2 mt-1">
                     <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-widest">Permanent Address</p>
                     <p className="text-[12.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-tight min-h-[20px]">
                        {admission.address && admission.address !== '---' ? admission.address : '\u00A0'}
                     </p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 flex flex-col items-center justify-start pt-1">
                <div className="w-full aspect-[3/4] border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center relative shadow-sm mb-2">
                  {admission.photo ? (
                    <img src={admission.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="text-slate-200 flex flex-col items-center gap-1">
                      <User size={24} stroke="#e2e8f0" strokeWidth={2} />
                      <span className="text-[6px] font-black uppercase tracking-widest text-center">Passport<br/>Photo</span>
                    </div>
                  )}
                </div>
                <div className="bg-white w-full py-1.5 px-1 rounded flex flex-col items-center border border-slate-200 shadow-sm">
                   <span className="text-[6px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">System ID</span>
                   <span className="text-[8px] font-mono font-bold text-slate-700 leading-tight text-center break-all">{admission.studentId || (admission as any).id || 'PENDING'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Academic Details */}
          <section className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 mb-3 shadow-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2.5 border-b border-slate-200 pb-1" style={{ color: prog.theme }}>Academic Enrollment & Subjects</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Program Category", value: prog.name },
                { label: "Academic Group", value: admission.group },
                { label: "Proposed Section", value: admission.section },
                { label: "Board Roll No", value: admission.boardRollNo },
                { label: "Previous Class", value: admission.previousClass },
                { label: "Grade / Marks", value: admission.previousMarks ? String(admission.previousMarks) : undefined },
                { label: "Previous Institute", value: admission.previousInstitute },
                { label: "Reference", value: admission.reference }
              ].map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <p className="text-[9.5px] text-slate-400 uppercase font-black tracking-widest">{item.label}</p>
                  <p className="text-[12.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-tight min-h-[20px]">
                    {item.value && item.value !== '---' && String(item.value).trim() !== '' ? item.value : '\u00A0'}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-2.5">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Course Subjects Authorized</p>
              <div className="flex flex-wrap gap-1.5">
                {(admission.subjects || []).map((subject: string) => (
                  <div key={subject} className="px-2.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-600 shadow-sm">
                    {subject}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Fee Breakdown */}
          <section className="mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 border-b border-slate-200 pb-1" style={{ color: prog.theme }}>Financial Structure & Payment Records</h3>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs bg-white">
                <thead style={{ backgroundColor: prog.theme + '10' }}>
                  <tr>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px] text-slate-700">{prog.isSemester ? 'Total Semester Fee' : 'Tuition Fee (Finalized)'}</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px] text-slate-700">Admission Fee</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px] text-slate-700">Misc Funds</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px]" style={{ color: prog.theme }}>Total Package</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px] text-emerald-600 bg-emerald-50">Total Paid</th>
                    <th className="py-2.5 px-3 font-black uppercase tracking-widest text-[9px] text-rose-600 bg-rose-50">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2.5 px-3 font-black text-slate-700 text-sm border-b border-slate-100">Rs. {(admission.totalFeeFinalized || (admission.totalPackage - (admission.admissionFee || 0) - (admission.miscFunds || 0)) || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-slate-700 text-sm border-b border-slate-100">Rs. {(admission.admissionFee || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-slate-700 text-sm border-b border-slate-100">Rs. {(admission.miscFunds || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-base border-b border-slate-100" style={{ color: prog.theme, backgroundColor: prog.theme + '05' }}>Rs. {(admission.totalPackage || admission.feeLedger?.totalPackage || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-emerald-600 text-sm bg-emerald-50/50 border-b border-slate-100">Rs. {(admission.feeReceived || admission.feeLedger?.totalReceived || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-black text-rose-600 text-sm bg-rose-50/50 border-b border-slate-100">Rs. {((admission.totalPackage || admission.feeLedger?.totalPackage || 0) - (admission.feeReceived || admission.feeLedger?.totalReceived || 0)).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-slate-50 py-2 px-4 flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2 font-bold text-slate-600">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                   <span className="italic">This document serves as an official verification of admission.</span>
                </div>
                <div className="font-black uppercase tracking-widest text-slate-500">
                  PAYMENT SCHEDULE: <span style={{ color: prog.theme }}>{prog.isSemester ? 'Per Semester Plan Verified' : 'Monthly Installment Plan Verified'}</span>
                </div>
              </div>
            </div>
          </section>

          {settings?.admissionSlipCustomText && (
            <div className="p-3 border border-dashed border-slate-200 rounded-xl mb-3 bg-white">
               <div className="whitespace-pre-line text-xs text-slate-600 font-medium leading-relaxed italic">
                 {settings.admissionSlipCustomText}
               </div>
            </div>
          )}

          {/* Footer Signatures with Verification QR */}
          <div className="mt-auto pt-3 border-t border-slate-200 flex justify-between items-end">
            <div className="flex items-center gap-3">
              {qrCodeUrl && (
                <div className="border border-slate-200 p-1 rounded-lg bg-white shadow-xs shrink-0">
                  <img src={qrCodeUrl} alt="QR Verification" className="w-14 h-14" />
                </div>
              )}
              <div className="text-[8px] text-slate-500 max-w-[240px] leading-tight font-medium">
                <p className="font-black text-slate-800 uppercase tracking-wider text-[8.5px] mb-0.5">Verification QR Code</p>
                <span>Issued by Superior College Registry. Official certification of admission and academic placement.</span>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center w-32">
                <div className="h-0.5 w-full bg-slate-300 mb-1"></div>
                <p className="text-[8px] font-black uppercase text-slate-400">Accountant Office</p>
              </div>
              <div className="text-center w-32">
                <div className="h-0.5 w-full bg-slate-800 mb-1"></div>
                <p className="text-[8px] font-black uppercase text-slate-800">Registrar Sign</p>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none w-[400px] h-[400px] flex items-center justify-center rounded-full overflow-hidden">
            {settings?.logo ? (
              <img src={settings.logo} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <School size={300} stroke="#001a1a" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({ label, value, isFull }: { label: string, value?: string, isFull?: boolean }) {
  if (!value || value === '---' || value === 'N/A' || value.trim() === '') return null;
  return (
    <div className={`space-y-0.5 ${isFull ? 'col-span-2' : ''}`}>
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{label}</p>
      <p className="text-[13px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-tight">{value}</p>
    </div>
  );
}
