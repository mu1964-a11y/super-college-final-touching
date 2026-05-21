
import * as React from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  School, 
  CreditCard, 
  AlertCircle,
  CheckCircle2,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getUnifiedTransactions } from '../utils/fee';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

export default function FeeReceipt({ student, settings }: { student: any, settings: any }) {
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const getProgramInfo = () => {
    const group = (student.group || student.category || '').toLowerCase();
    
    if (group.includes('uk') || group.includes('level 3')) {
      return {
        name: 'UK LEVEL 3',
        theme: '#1e40af', // Blue
        secondary: '#60a5fa',
        isSemester: true,
        termLabel: 'Per Semester'
      };
    }
    if (group.includes('dit')) {
      return {
        name: 'D.I.T',
        theme: '#065f46', // Emerald
        secondary: '#34d399',
        isSemester: true,
        termLabel: 'Per Semester'
      };
    }
    if (group.includes('bs')) {
      return {
        name: 'B.S PROGRAM',
        theme: '#9f1239', // Rose/Maroon
        secondary: '#fb7185',
        isSemester: true,
        termLabel: 'Per Semester'
      };
    }

    return {
      name: 'INTERMEDIATE (F.Sc)',
      theme: settings?.themeColor || '#0b4d45', // Superior Teal
      secondary: '#d4af37', // Gold
      isSemester: false,
      termLabel: 'Per Installment'
    };
  };

  const prog = getProgramInfo();

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    const toastId = toast.loading("Generating Official Fee Receipt...");
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Fee-Receipt-${student.fullName?.replace(/\s+/g, '_') || 'Student'}.pdf`);
      toast.dismiss(toastId);
      toast.success("Fee Receipt downloaded!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to download receipt");
    }
  };

  const reactToPrintFn = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Fee_Receipt_${student.fullName?.replace(/\s+/g, '_') || 'Student'}`,
    onPrintError: (error) => {
      console.error(error);
      toast.error("Printing failed. Using download fallback.");
      downloadReceipt();
    }
  });

  const handlePrintClick = () => {
    try {
      const isIframe = window !== window.parent;
      if (isIframe) {
        toast.info("Direct printing is blocked in Preview Mode. To use Print, please click 'Open App in New Tab' (top right corner). Downloading PDF fallback...", { duration: 6000 });
        downloadReceipt();
      } else {
        reactToPrintFn();
      }
    } catch (e) {
      toast.info("Attempting PDF download fallback...");
      downloadReceipt();
    }
  };

  const admissionFee = student.admissionFee || 0;
  const unifiedTransactions = getUnifiedTransactions(student);
  const miscFunds = student.miscFunds || 0;
  const totalPackage = student.totalPackage || student.feeLedger?.totalPackage || 0;
  const feeReceived = student.feeReceived || student.feeLedger?.totalReceived || 0;
  const tuitionFee = student.totalFeeFinalized || (totalPackage - admissionFee - miscFunds);
  
  const outstanding = totalPackage - feeReceived;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
        <h3 className="text-xl font-serif font-bold text-superior-teal">Fee Receipt Preview</h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handlePrintClick} className="rounded-xl font-bold">
            Print
          </Button>
          <Button className="bg-slate-800 text-white font-black rounded-xl hover:bg-slate-900 shadow-lg" onClick={downloadReceipt}>
            Download PDF Legal
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex justify-center preview-scroll-container">
        <div 
          ref={receiptRef}
          className="w-[794px] min-h-[561px] h-fit bg-white p-6 relative shadow-2xl overflow-hidden print-area flex flex-col"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-0">
            <div className="w-full flex items-center justify-center gap-4 mb-1">
               <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0">
                {settings?.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <School size={40} />
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-3xl font-serif font-black tracking-tighter whitespace-nowrap uppercase mb-0" style={{ color: settings?.themeColor || '#0b4d45' }}>{settings?.collegeName || 'Superior College Jahanniah'}</h1>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                   <span>Email: {settings?.email || 'N/A'}</span>
                   <span className="opacity-50">|</span>
                   <span>Contact: {settings?.contactNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Separator and Title */}
            <div className="w-full border-t border-b border-slate-200 mt-1 py-1 flex justify-between items-center px-2 mb-2" style={{ borderColor: prog.theme + '20' }}>
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">SLIP ID: <span className="font-black" style={{ color: prog.theme }}>{unifiedTransactions?.[0]?.receiptId?.slice(-6) || Math.floor(Date.now() / 1000).toString().slice(-6)}</span></p>
              
              <div className="flex flex-col items-center gap-0">
                <span className="text-base font-black uppercase tracking-[0.2em] text-slate-800 leading-none" style={{ color: prog.theme }}>FEE RECEIPT</span>
                <span className="urdu-text text-[9px] font-bold text-slate-600 leading-none mt-1" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>فیس رسید</span>
              </div>

              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">Print Date: <span className="font-black" style={{ color: prog.theme }}>{new Date().toLocaleString()}</span></p>
            </div>
          </div>

          {/* Student Identifiers - Minimal Text Layout */}
          <div className="flex border-b border-slate-200 pb-2 mb-2">
            {/* Student Info */}
            <div className="flex items-center gap-4 w-2/3 border-r border-slate-200 pr-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <User size={24} stroke="#cbd5e1" strokeWidth={2} />
                    <span className="text-[6px] font-black uppercase tracking-widest mt-1 text-center">No Photo</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Student / Particulars (طالب علم)</p>
                <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{student.fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <p className="font-bold text-slate-600">Father: <span className="text-slate-800">{student.fatherName}</span></p>
                  <p className="font-bold text-slate-600">ID: <span className="text-slate-800 tracking-wider">{(student as any).studentId || student.id || 'N/A'}</span></p>
                  <p className="font-black" style={{ color: prog.theme }}>{student.category || student.academicGroup}</p>
                </div>
              </div>
            </div>
            
            {/* Session Info */}
            <div className="w-1/3 pl-4 flex flex-col justify-center gap-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Session</p>
                <p className="font-black text-slate-800">{student.session || '2024-26'}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Contact</p>
                <p className="font-bold text-slate-800 tracking-wider font-mono">{student.contactNumber || student.contact || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Table Header Section */}
          <div className="flex items-center gap-2 mb-1 pb-1 border-b border-slate-200">
            <CreditCard size={14} className="text-slate-800" stroke="#1e293b" strokeWidth={2.5} />
            <h3 className="text-sm font-serif font-black text-slate-900">Financial Statement Breakdown</h3>
            <span className="urdu-text text-[10px] text-slate-500 font-bold ml-auto" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>مالی تفصیلات برائے فیس</span>
          </div>

          {/* Ledger Table - Plain Text Format */}
          <div className="mb-2 px-2">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-700 italic">{prog.isSemester ? 'Total Semester/BS Program Fee' : 'Tuition Fee (Finalized)'} <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(تعلیمی فیس)</span></span>
              <span className="font-black text-slate-900 text-[11px] tracking-tight">Rs. {tuitionFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-700 italic">Official Admission Fee <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(داخلہ فیس)</span></span>
              <span className="font-black text-slate-900 text-[11px] tracking-tight">Rs. {admissionFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-700 italic">Miscellaneous Charges & Funds <span className="text-[9px] text-slate-500" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(متفرق فنڈز)</span></span>
              <span className="font-black text-slate-900 text-[11px] tracking-tight">Rs. {miscFunds.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1 mt-1 border-t-2" style={{ borderTopColor: prog.theme + '40' }}>
              <span className="font-black text-[10px] uppercase tracking-tighter" style={{ color: prog.theme }}>TOTAL PACKAGE VALUE <span className="text-[9px] opacity-80 normal-case" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(کل پیکج)</span></span>
              <span className="font-black text-[13px] tracking-tighter" style={{ color: prog.theme }}>Rs. {totalPackage.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment History Section - Plain Text Format */}
          <div className="mb-2 px-2 border-t-2 border-slate-200 pt-2 shrink-0">
            <div className="flex justify-between items-end mb-2">
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Payment History Logs</h4>
            </div>
            {(unifiedTransactions.length > 0 || feeReceived > 0) ? (
              <div className="space-y-0.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-300">
                  <div className="w-1/4 text-slate-600 font-black uppercase tracking-widest text-[8px]">Date</div>
                  <div className="w-1/4 text-slate-600 font-black uppercase tracking-widest text-[8px]">Receipt/Tx ID</div>
                  <div className="w-1/4 text-slate-600 font-black uppercase tracking-widest text-[8px]">Description</div>
                  <div className="w-1/4 text-right text-slate-600 font-black uppercase tracking-widest text-[8px]">Amount</div>
                </div>
                
                {unifiedTransactions.slice(0, 4).map((tx: any, idx: number) => (
                  <div key={tx.id || idx} className="flex items-center justify-between py-1 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div className="w-1/4 text-[9px] font-mono font-bold text-slate-700 flex flex-col">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                    </div>
                    <div className="w-1/4 text-[9px] font-mono text-slate-500 font-semibold">{tx.receiptId || tx.id}</div>
                    <div className="w-1/4 text-[9px] font-bold text-slate-800 flex flex-col">
                      <span className="truncate">{tx.description || tx.method || 'Fee Payment'}</span>
                    </div>
                    <div className="w-1/4 text-right font-black text-emerald-700 text-xs tracking-tight">+ Rs. {(tx.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
                {unifiedTransactions.length > 4 && (
                  <div className="py-0.5 text-center text-[8px] font-bold italic text-slate-400">
                    +{unifiedTransactions.length - 4} more transactions omitted for print layout...
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5 border-b-2 border-emerald-600 bg-emerald-50/50 px-2 rounded-sm mt-1">
                  <span className="font-black text-emerald-800 text-[10px] tracking-widest uppercase">TOTAL RECEIVED AMOUNT</span>
                  <span className="font-black text-emerald-700 text-[15px] tracking-tighter">Rs. {feeReceived.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-2 flex flex-col items-center justify-center border border-slate-200 border-dashed rounded bg-slate-50/50">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">No Payment History Found</p>
              </div>
            )}
          </div>

          {/* Balance & Semester Progress Section */}
          <div className="mb-2 space-y-2 mt-auto">
             {prog.isSemester && (
               <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Semester Academic Tracking</p>
                      <div className="flex gap-1.5">
                         {Array.from({ length: (student.group || '').toLowerCase().includes('dit') ? 4 : (student.group || '').toLowerCase().includes('level 3') || (student.group || '').toLowerCase().includes('uk') ? 3 : 8 }).map((_, i, arr) => {
                           const semesterFee = totalPackage / arr.length;
                           const isPaid = feeReceived >= (i + 1) * semesterFee;
                           return (
                             <div key={i} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${isPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                <span className={`text-[7px] font-black ${isPaid ? 'text-emerald-700' : 'text-slate-400'}`}>SEM {i+1}</span>
                                {isPaid ? <CheckCircle2 size={10} className="text-emerald-600" /> : <div className="w-2 h-2 rounded-full border-2 border-slate-200" />}
                             </div>
                           );
                         })}
                      </div>
                    </div>
                  </div>
               </div>
             )}

             <div className="flex justify-between items-center px-1 py-1.5 bg-rose-50/50 border border-rose-100 rounded">
                <div className="flex items-center gap-2 text-rose-700 px-2">
                   <AlertCircle size={14} />
                   <p className="text-[11px] font-black uppercase tracking-widest">Outstanding Balance:</p>
                   <p className="text-base font-black italic">Rs. {outstanding.toLocaleString()}</p>
                   <span className="urdu-text text-[9px] font-bold opacity-80 ml-2">(بقایا جات برائے فیس)</span>
                </div>
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic pr-2">
                  * All amounts are in PKR
                </div>
             </div>
          </div>

          {/* Instructions */}
          <div className="mb-4 mt-2 px-1">
            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-1 border-b border-slate-200 pb-1 flex items-center justify-between">
              Institutional Financial Guidelines 
              <span className="urdu-text mr-2" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(ضروری نوٹ)</span>
            </h4>
            
            {settings?.feeReceiptCustomText ? (
              <div className="whitespace-pre-line text-[9px] text-slate-600 font-semibold leading-tight italic">
                {settings.feeReceiptCustomText}
              </div>
            ) : (
              <ul className="text-[9px] text-slate-600 font-semibold leading-tight space-y-0.5 list-disc pl-4 italic">
                  <li>This is a computer-generated document. No signature needed.</li>
                  <li>The submitted fee is neither refundable nor transferable.</li>
                  <li>The receipt cannot be challenged in any court of law.</li>
                  <li>Late fee charges may be applied if these are not cleared within the due date.</li>
              </ul>
            )}
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between px-4 pb-2 mt-auto">
            <div className="text-center w-48 border-t-2 border-slate-200 pt-2 group">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-500 transition-colors">Treasury Officer</p>
              <p className="text-[7px] text-slate-300 font-bold mt-0.5">DEPARTMENT OF FINANCE</p>
            </div>
            <div className="text-center w-48 border-t-2 border-slate-800 pt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Registrar Verification</p>
              <p className="text-[7px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">Superior Group Records</p>
            </div>
          </div>

          {/* Bottom Branding */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none w-[300px] h-[300px] flex items-center justify-center rounded-full overflow-hidden">
            {settings?.logo ? (
              <img src={settings.logo} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <School size={200} stroke="#001a1a" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
