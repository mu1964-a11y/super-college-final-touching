
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
  AlertCircle,
  Shield,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { exportElementToPdf, exportElementToImage } from '../utils/documentExporter';
import QRCode from 'qrcode';
import { Admission } from '../types';

export default function AdmissionSlip({ admission, settings }: { admission: Admission | any, settings: any }) {
  const slipRef = React.useRef<HTMLDivElement>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string>('');

  React.useEffect(() => {
    if (!admission) return;
    const verifyId = admission.collegeNo || admission.studentId || admission.id || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://superiorcollegejahanian.com';
    const qrPayload = `${origin}/?verify=student&id=${encodeURIComponent(verifyId)}&roll=${encodeURIComponent(admission.collegeNo || '')}&student_id=${encodeURIComponent(admission.studentId || '')}&adm_id=${encodeURIComponent(admission.id || '')}`;

    QRCode.toDataURL(qrPayload, {
      width: 140,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    }).then(setQrCodeUrl).catch(console.error);
  }, [admission]);

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
    const toastId = toast.loading("Generating High-Fidelity Admission Slip PDF...");
    try {
      await exportElementToPdf(slipRef.current, {
        filename: `Admission_Slip_${admission.fullName?.replace(/\s+/g, '_') || 'Student'}`,
        format: 'a4',
        orientation: 'portrait',
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        marginMm: 6,
      });
      toast.dismiss(toastId);
      toast.success("Admission Slip downloaded successfully!");
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
          className="w-[794px] bg-white px-8 py-5 relative shadow-2xl overflow-hidden print-area flex flex-col gap-2"
          style={{ width: '794px', fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-0.5">
            <div className="w-full flex items-center justify-center gap-5 mb-1">
               <div 
                 className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0"
                 style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px', clipPath: 'circle(49.5% at 50% 50%)' }}
               >
                {settings?.logo ? (
                  <img 
                    src={settings.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain rounded-full select-none" 
                    style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                    width={64}
                    height={64}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <School size={32} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight whitespace-nowrap uppercase mb-0.5" style={{ color: settings?.themeColor || '#0b4d45' }}>{settings?.collegeName || 'Superior College Jahanian'}</h1>
                <div className="flex items-center gap-3 text-[9.5px] font-bold uppercase tracking-widest text-slate-500">
                   <span>Email: {settings?.email || 'N/A'}</span>
                   <span className="opacity-40">|</span>
                   <span>Contact: {settings?.contactNumber || 'N/A'}</span>
                   <span className="opacity-40">|</span>
                   <span>Portal: superiorjahanian.edu.pk</span>
                </div>
              </div>
            </div>

            <div className="w-full border-b pb-1.5 flex flex-col items-center gap-1" style={{ borderColor: prog.theme + '30' }}>
              <div className="flex items-center gap-3">
                <p className="text-lg font-black uppercase tracking-[0.25em] text-slate-800 leading-none" style={{ color: prog.theme }}>OFFICIAL ADMISSION SLIP</p>
                {admission.concessionReason && (
                  <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5">
                    ★ {admission.concessionReason} Scholarship
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3.5 mt-0.5">
                <span className="text-[9.5px] font-mono font-black text-slate-500">STUDENT ID: <span style={{ color: prog.theme }}>{admission.studentId || (admission as any).id || 'PENDING'}</span></span>
                <span className="text-[9.5px] font-mono font-black text-slate-500">ROLL NO: <span className="text-emerald-700 font-bold">{admission.collegeNo || 'UNASSIGNED'}</span></span>
                <span className="text-[9.5px] font-mono font-black text-slate-500">SECTION: <span style={{ color: prog.theme }}>{admission.section || 'A'}</span></span>
                <span className="text-[9.5px] font-mono font-black text-slate-500">SESSION: <span style={{ color: prog.theme }}>{admission.session || settings?.academicSession || '2026-28'}</span></span>
                <span className="text-[9.5px] font-mono font-black text-slate-500">DATE: <span style={{ color: prog.theme }}>{admission.date}</span></span>
              </div>
            </div>
          </div>

          {/* 4 Core Modules Container - Contiguously aligned ("7 7") without artificial gaps */}
          <div className="flex flex-col gap-1.5 w-full">
            {/* Section 1: Student Profile & Demographics */}
            <section className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 shadow-2xs">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 border-b border-slate-200 pb-0.5" style={{ color: prog.theme }}>Student Profile & Demographics</h3>
              <div className="grid grid-cols-12 gap-3.5">
                <div className="col-span-10">
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-5">
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
                        <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wider leading-none">{item.label}</p>
                        <p className="text-[11.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-snug truncate">
                          {item.value && item.value !== '---' && String(item.value).trim() !== '' ? item.value : '\u00A0'}
                        </p>
                      </div>
                    ))}
                    <div className="space-y-0.5 col-span-2 mt-0.5">
                       <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wider leading-none">Permanent Address</p>
                       <p className="text-[11.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-snug truncate">
                          {admission.address && admission.address !== '---' && String(admission.address).trim() !== '' ? admission.address : '\u00A0'}
                       </p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2 flex flex-col items-center justify-start">
                  <div className="w-full aspect-[3/4] border border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center relative shadow-xs mb-1.5">
                    {admission.photo ? (
                      <img src={admission.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-slate-200 flex flex-col items-center gap-1">
                        <User size={22} stroke="#e2e8f0" strokeWidth={2} />
                        <span className="text-[6px] font-black uppercase tracking-widest text-center">Passport<br/>Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white w-full py-1 px-1 rounded flex flex-col items-center border border-slate-200 shadow-2xs">
                     <span className="text-[6px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">System ID</span>
                     <span className="text-[8px] font-mono font-bold text-slate-700 leading-tight text-center break-all">{admission.studentId || (admission as any).id || 'PENDING'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Academic Details */}
            <section className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 shadow-2xs">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] mb-2 border-b border-slate-200 pb-0.5" style={{ color: prog.theme }}>Academic Enrollment & Subjects</h3>
              <div className="grid grid-cols-3 gap-x-5 gap-y-1.5">
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
                    <p className="text-[8.5px] text-slate-400 uppercase font-black tracking-wider leading-none">{item.label}</p>
                    <p className="text-[11.5px] font-bold text-slate-800 border-b border-slate-100 pb-0.5 leading-snug truncate">
                      {item.value && item.value !== '---' && String(item.value).trim() !== '' ? item.value : '\u00A0'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200/60">
                <p className="text-[8.5px] text-slate-400 font-black uppercase tracking-wider mb-1 leading-none">Course Subjects Authorized</p>
                <div className="flex flex-wrap gap-1">
                  {(admission.subjects || []).map((subject: string) => (
                    <div key={subject} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[8.5px] font-bold text-slate-600 shadow-2xs">
                      {subject}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 3: Financial Structure & Payment Records */}
            <section className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/80 shadow-2xs">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 border-b border-slate-200 pb-0.5" style={{ color: prog.theme }}>Financial Structure & Payment Records</h3>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs bg-white">
                  <thead style={{ backgroundColor: prog.theme + '10' }}>
                    <tr>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px] text-slate-700">{prog.isSemester ? 'Total Semester Fee' : 'Tuition Fee (Finalized)'}</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px] text-slate-700">Admission Fee</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px] text-slate-700">Misc Funds</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px]" style={{ color: prog.theme }}>Total Package</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px] text-emerald-700 bg-emerald-50">Total Paid</th>
                      <th className="py-2 px-3 font-black uppercase tracking-wider text-[8.5px] text-rose-700 bg-rose-50">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 font-black text-slate-700 text-xs border-b border-slate-100">Rs. {(admission.totalFeeFinalized || (admission.totalPackage - (admission.admissionFee || 0) - (admission.miscFunds || 0)) || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-black text-slate-700 text-xs border-b border-slate-100">Rs. {(admission.admissionFee || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-black text-slate-700 text-xs border-b border-slate-100">Rs. {(admission.miscFunds || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-black text-sm border-b border-slate-100" style={{ color: prog.theme, backgroundColor: prog.theme + '05' }}>Rs. {(admission.totalPackage || admission.feeLedger?.totalPackage || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-black text-emerald-600 text-xs bg-emerald-50/50 border-b border-slate-100">Rs. {(admission.feeReceived || admission.feeLedger?.totalReceived || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 font-black text-rose-600 text-xs bg-rose-50/50 border-b border-slate-100">Rs. {((admission.totalPackage || admission.feeLedger?.totalPackage || 0) - (admission.feeReceived || admission.feeLedger?.totalReceived || 0)).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="bg-slate-50/90 py-1.5 px-3 flex justify-between items-center text-[9px] border-t border-slate-100">
                  <div className="flex items-center gap-1.5 font-bold text-slate-600">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                     <span className="italic">Official verified admission ledger record.</span>
                  </div>
                  <div className="font-black uppercase tracking-wider text-slate-500">
                    PAYMENT SCHEDULE: <span style={{ color: prog.theme }}>{prog.isSemester ? 'Per Semester Plan Verified' : 'Monthly Installment Plan Verified'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Official Undertaking & Student / Guardian Declaration */}
            <section className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-2">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-1.5" style={{ color: prog.theme }}>
                  <Shield size={11} className="shrink-0" />
                  Official Institutional Undertaking & Rules of Conduct
                </h3>
                <span className="text-[7.5px] font-mono font-black uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Statutory Compliance
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] text-slate-600 leading-tight mb-2.5">
                <div className="flex items-start gap-1">
                  <span className="font-black text-slate-900 shrink-0">1.</span>
                  <span><strong>Attendance Mandate:</strong> Minimum 75% classroom attendance is compulsory for academic retention & board examination eligibility.</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-black text-slate-900 shrink-0">2.</span>
                  <span><strong>Fee Compliance:</strong> All dues/installments must be deposited by the 10th of each calendar month. Fine applies thereafter.</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-black text-slate-900 shrink-0">3.</span>
                  <span><strong>Campus Decorum:</strong> Prescribed Superior uniform, ID card display, and disciplinary code are strictly mandatory on campus.</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-black text-slate-900 shrink-0">4.</span>
                  <span><strong>Policy Clause:</strong> Admission registration fee and affiliated institutional funds once deposited are strictly non-refundable.</span>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between gap-4">
                <p className="text-[7.5px] italic text-slate-500 max-w-[340px] leading-tight">
                  "I solemnly affirm that all information provided is authentic. I undertake to adhere strictly to all academic, disciplinary, and fee statutes of Superior College."
                </p>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="w-28 border-b border-slate-400 mb-0.5"></div>
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-600">Student Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-0.5"></div>
                    <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-600">Father / Guardian Sign</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Section 5: Footer with Universal Verification QR & Administrative Signatures */}
          <div className="pt-2 border-t-2 border-slate-200 flex justify-between items-end mt-1">
            <div className="flex items-center gap-3">
              {qrCodeUrl && (
                <div className="border border-slate-300 p-1 rounded-xl bg-white shadow-xs shrink-0" style={{ width: '60px', height: '60px' }}>
                  <img 
                    src={qrCodeUrl} 
                    alt="Universal QR Verification" 
                    className="w-full h-full object-contain" 
                    style={{ width: '52px', height: '52px', objectFit: 'contain' }}
                    width={52}
                    height={52}
                  />
                </div>
              )}
              <div className="text-[7.5px] text-slate-600 max-w-[280px] leading-tight">
                <p className="font-black text-slate-900 uppercase tracking-wider text-[8.5px] mb-0.5 flex items-center gap-1">
                  <span>Universal Verification QR</span>
                  <span className="text-[7px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">Live Database</span>
                </p>
                <span>Scan anytime to retrieve 100% up-to-date central academic, fee clearance, and attendance dossier directly from college registry.</span>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center w-28">
                <div className="h-0.5 w-full bg-slate-300 mb-1"></div>
                <p className="text-[7.5px] font-black uppercase text-slate-400">Accountant Office</p>
              </div>
              <div className="text-center w-36">
                <div className="h-0.5 w-full bg-slate-800 mb-1"></div>
                <p className="text-[7.5px] font-black uppercase text-slate-900">Registrar Sign & Stamp</p>
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center rounded-full overflow-hidden select-none"
            style={{ width: '360px', height: '360px', opacity: 0.045, clipPath: 'circle(49.5% at 50% 50%)' }}
          >
            {settings?.logo ? (
              <img 
                src={settings.logo} 
                alt="" 
                className="w-full h-full object-contain rounded-full mix-blend-multiply" 
                style={{ width: '360px', height: '360px', objectFit: 'contain' }}
                width={360}
                height={360}
              />
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
