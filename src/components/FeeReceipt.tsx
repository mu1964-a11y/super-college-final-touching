
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
import { toPng } from 'html-to-image';

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
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        includeQueryParams: true,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          margin: '0',
        }
      });
      
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
          className="w-[794px] min-h-[1123px] h-fit bg-white p-10 relative shadow-2xl overflow-hidden print-area flex flex-col"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-0">
            <div className="w-full flex items-center justify-center gap-6 mb-1">
               <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 bg-white shadow-sm shrink-0">
                {settings?.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <School size={40} />
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

            {/* Separator and Title */}
            <div className="w-full border-t border-b border-slate-200 mt-1 py-1.5 flex justify-between items-center px-2 mb-4" style={{ borderColor: prog.theme + '20' }}>
              <p className="text-[10px] font-mono font-black text-slate-400 uppercase">SLIP ID: <span style={{ color: prog.theme }}>{unifiedTransactions?.[0]?.receiptId?.slice(-6) || Math.floor(Date.now() / 1000).toString().slice(-6)}</span></p>
              
              <div className="flex flex-col items-center gap-0">
                <span className="text-lg font-black uppercase tracking-[0.2em] text-slate-800 leading-none" style={{ color: prog.theme }}>FEE RECEIPT</span>
                <span className="urdu-text text-[10px] font-medium text-slate-500 leading-none mt-1" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>فیس رسید</span>
              </div>

              <p className="text-[10px] font-mono font-black text-slate-400 uppercase">Print Date: <span style={{ color: prog.theme }}>{new Date().toLocaleString()}</span></p>
            </div>
          </div>

          {/* Student Identifiers - Minimal Text Layout */}
          <div className="flex border-b border-slate-200 pb-4 mb-4">
            {/* Student Info */}
            <div className="flex items-center gap-4 w-2/3 border-r border-slate-200 pr-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                {student.photo ? (
                  <img src={student.photo} alt={student.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <User size={24} stroke="#cbd5e1" strokeWidth={2} />
                    <span className="text-[6px] font-black uppercase tracking-widest mt-1 text-center">No Photo</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Student / Particulars (طالب علم)</p>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">{student.fullName}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <p className="font-bold text-slate-500">Father: <span className="text-slate-700">{student.fatherName}</span></p>
                  <p className="font-bold text-slate-500">ID: <span className="text-slate-700 tracking-wider">{(student as any).studentId || student.id || 'N/A'}</span></p>
                  <p className="font-bold" style={{ color: prog.theme }}>{student.category || student.academicGroup}</p>
                </div>
              </div>
            </div>
            
            {/* Session Info */}
            <div className="w-1/3 pl-6 flex flex-col justify-center gap-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Session</p>
                <p className="font-black text-slate-800">{student.session || '2024-26'}</p>
              </div>
              <div className="flex justify-between items-center pb-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Contact</p>
                <p className="font-black text-slate-800 tracking-wider font-mono">{student.contactNumber || student.contact || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Table Header Section */}
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-200">
            <CreditCard size={18} className="text-slate-800" stroke="#1e293b" strokeWidth={2} />
            <h3 className="text-base font-serif font-black text-slate-800">Financial Statement Breakdown</h3>
            <span className="urdu-text text-xs text-slate-400 font-medium ml-auto" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>مالی تفصیلات برائے فیس</span>
          </div>

          {/* Ledger Table - Plain Text Format */}
          <div className="mb-4 px-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 italic">{prog.isSemester ? 'Total Semester/BS Program Fee' : 'Tuition Fee (Finalized)'} <span className="text-[11px] text-slate-400" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(تعلیمی فیس)</span></span>
              <span className="font-black text-slate-900 text-xs tracking-tight">Rs. {tuitionFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 italic">Official Admission Fee <span className="text-[11px] text-slate-400" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(داخلہ فیس)</span></span>
              <span className="font-black text-slate-900 text-xs tracking-tight">Rs. {admissionFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 italic">Miscellaneous Charges & Funds <span className="text-[11px] text-slate-400" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(متفرق فنڈز)</span></span>
              <span className="font-black text-slate-900 text-xs tracking-tight">Rs. {miscFunds.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b-2" style={{ borderBottomColor: prog.theme + '40' }}>
              <span className="font-black text-[11px] uppercase tracking-tighter" style={{ color: prog.theme }}>TOTAL PACKAGE VALUE <span className="text-[11px] opacity-70 normal-case" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(کل پیکج)</span></span>
              <span className="font-black text-sm tracking-tighter" style={{ color: prog.theme }}>Rs. {totalPackage.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment History Section - Plain Text Format */}
          <div className="mb-4 px-2 border-t border-slate-200 pt-3 mt-4">
            <div className="flex justify-between items-end mb-4">
               <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Payment History Logs</h4>
            </div>
            {(unifiedTransactions.length > 0 || feeReceived > 0) ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between pb-2 border-b-2 border-slate-200">
                  <div className="w-1/4 text-slate-500 font-black uppercase tracking-widest text-[9px]">Date</div>
                  <div className="w-1/4 text-slate-500 font-black uppercase tracking-widest text-[9px]">Receipt/Tx ID</div>
                  <div className="w-1/4 text-slate-500 font-black uppercase tracking-widest text-[9px]">Description</div>
                  <div className="w-1/4 text-right text-slate-500 font-black uppercase tracking-widest text-[9px]">Amount</div>
                </div>
                
                {unifiedTransactions.map((tx: any, idx: number) => (
                  <div key={tx.id || idx} className="flex items-center justify-between py-2 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <div className="w-1/4 text-[10px] font-mono font-bold text-slate-600 flex flex-col">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      <span className="text-[8px] text-slate-400">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="w-1/4 text-[10px] font-mono text-slate-400">{tx.receiptId || tx.id}</div>
                    <div className="w-1/4 text-[11px] font-medium text-slate-700 flex flex-col">
                      <span>{tx.description || tx.method || 'Fee Payment'}</span>
                      {tx.recordedBy && <span className="text-[8px] text-slate-400 font-bold">BY: {tx.recordedBy}</span>}
                    </div>
                    <div className="w-1/4 text-right font-black text-emerald-600 text-sm tracking-tight">+ Rs. {(tx.amount || 0).toLocaleString()}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-3 border-t-2 border-emerald-600 mt-2 bg-emerald-50/50 px-2 rounded-lg">
                  <span className="font-black text-emerald-700 text-xs tracking-widest uppercase">TOTAL RECEIVED AMOUNT</span>
                  <span className="font-black text-emerald-700 text-lg tracking-tighter">Rs. {feeReceived.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center justify-center border border-slate-200 border-dashed rounded-lg bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">No Payment History Found</p>
              </div>
            )}
          </div>

          {/* Balance & Semester Progress Section */}
          <div className="mb-6 space-y-4">
             {prog.isSemester && (
               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Semester Academic Tracking</p>
                      <div className="flex gap-2">
                         {Array.from({ length: (student.group || '').toLowerCase().includes('dit') ? 4 : (student.group || '').toLowerCase().includes('level 3') || (student.group || '').toLowerCase().includes('uk') ? 3 : 8 }).map((_, i, arr) => {
                           const semesterFee = totalPackage / arr.length;
                           const isPaid = feeReceived >= (i + 1) * semesterFee;
                           return (
                             <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-lg border ${isPaid ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                                <span className={`text-[8px] font-black ${isPaid ? 'text-emerald-600' : 'text-slate-400'}`}>SEM {i+1}</span>
                                {isPaid ? <CheckCircle2 size={12} className="text-emerald-500" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-100" />}
                             </div>
                           );
                         })}
                      </div>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-6">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Package Verified</p>
                      <p className="text-xl font-black italic" style={{ color: prog.theme }}>Rs. {totalPackage.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Ledger Roll Forward */}
                  <div className="pt-3 border-t border-slate-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Fee Amount</p>
                        <p className="text-sm font-black text-slate-800">Rs. {totalPackage.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Paid To Date</p>
                        <p className="text-sm font-black text-emerald-700">Rs. {feeReceived.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 mb-1">Carried Forward Balance</p>
                        <p className="text-sm font-black text-rose-700">Rs. {outstanding.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
               </div>
             )}

             <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2 text-rose-600">
                   <AlertCircle size={16} />
                   <p className="text-xs font-black uppercase tracking-widest">Outstanding Balance:</p>
                   <p className="text-lg font-black italic">Rs. {outstanding.toLocaleString()}</p>
                   <span className="urdu-text text-[10px] font-medium opacity-60 ml-2">(بقایا جات برائے فیس)</span>
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                  * All amounts are in Pakistani Rupees (PKR)
                </div>
             </div>
          </div>

          {/* Instructions */}
          <div className="mb-12 mt-4 px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2 border-b border-slate-100 pb-1.5 flex items-center justify-between">
              Institutional Financial Guidelines 
              <span className="urdu-text mr-2" style={{ fontFamily: "'Jameel Noori Nastaliq', 'Noto Nastaliq Urdu', serif" }}>(ضروری نوٹ)</span>
            </h4>
            
            {settings?.feeReceiptCustomText ? (
              <div className="whitespace-pre-line text-[10px] text-slate-500 font-medium leading-tight italic">
                {settings.feeReceiptCustomText}
              </div>
            ) : (
              <ul className="text-[10px] text-slate-500 font-medium leading-tight space-y-1 list-disc pl-4 italic">
                  <li>This is a computer-generated document. No signature needed.</li>
                  <li>The submitted fee is neither refundable nor transferable.</li>
                  <li>The receipt cannot be challenged in any court of law.</li>
                  <li>Late fee charges may be applied if these are not cleared within the due date.</li>
              </ul>
            )}
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-between px-6 pb-6">
            <div className="text-center w-64 border-t-2 border-slate-200 pt-3 group">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-slate-400 transition-colors">Treasury Officer</p>
              <p className="text-[8px] text-slate-200 font-bold mt-1">DEPARTMENT OF FINANCE</p>
            </div>
            <div className="text-center w-64 border-t-2 border-slate-900 pt-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Registrar Verification</p>
              <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Superior Group Records</p>
            </div>
          </div>

          {/* Bottom Branding */}
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
