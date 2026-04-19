
import * as React from 'react';
import { 
  School, 
  CreditCard, 
  AlertCircle 
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
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export default function FeeReceipt({ student, settings }: { student: any, settings: any }) {
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    const toastId = toast.loading("Generating Official Fee Receipt...");
    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgProps = new Image();
      imgProps.src = dataUrl;
      await new Promise((resolve) => { imgProps.onload = resolve; });
      
      const pdfWidth = 210;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(297, pdfHeight)]);
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Fee-Receipt-${student.fullName.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss(toastId);
      toast.success("Fee Receipt downloaded!");
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Failed to download receipt");
    }
  };

  const admissionFee = student.admissionFee || 0;
  const miscFunds = student.miscFunds || 0;
  const totalPackage = student.totalPackage || 0;
  const feeReceived = student.feeReceived || student.feeLedger?.totalReceived || 0;
  const tuitionFee = student.totalFeeFinalized || (totalPackage - admissionFee - miscFunds);
  
  const outstanding = totalPackage - feeReceived;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
        <h3 className="text-xl font-serif font-bold text-superior-teal">Fee Receipt Preview (بکایا جاتی رسید)</h3>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="rounded-xl font-bold">
            Print
          </Button>
          <Button className="bg-superior-gold text-superior-teal font-black rounded-xl hover:bg-superior-gold/90" onClick={downloadReceipt}>
            Download PDF Receipt
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-10 flex justify-center">
        <div 
          ref={receiptRef}
          className="w-[210mm] min-h-[297mm] bg-white p-16 relative shadow-2xl"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b-8 border-superior-gold pb-8 mb-12">
            <div className="flex items-center gap-8">
              <div className="w-28 h-28 rounded-3xl bg-superior-teal flex items-center justify-center text-white shadow-xl overflow-hidden">
                {settings.logo ? (
                  <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <School size={56} className="text-superior-gold" />
                )}
              </div>
              <div>
                <h1 className="text-5xl font-serif font-black text-superior-teal tracking-tighter" style={{ color: settings.themeColor }}>{settings.collegeName}</h1>
                <p className="text-superior-gold font-black tracking-[0.4em] text-lg mt-2 uppercase">{settings.campusName}</p>
                <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">{settings.email} | {settings.contactNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-slate-800 text-white px-10 py-4 rounded-3xl font-black text-xl mb-4 shadow-lg flex flex-col items-center">
                <span>FEE RECEIPT</span>
                <span className="urdu-text text-superior-gold text-sm font-medium">فیس رسید</span>
              </div>
              <p className="text-sm font-mono font-black text-superior-teal uppercase">REC-ID: {Math.floor(Date.now() / 1000).toString().slice(-6)}</p>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Student Identifiers */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Student Particulars</p>
              <h2 className="text-3xl font-black text-slate-800">{student.fullName}</h2>
              <div className="flex items-center gap-4 mt-3">
                <span className="bg-superior-teal/10 text-superior-teal px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">ID: {student.id || student.studentId || 'N/A'}</span>
                <span className="bg-superior-gold/10 text-superior-gold px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">{student.category || student.academicGroup}</span>
              </div>
              <p className="text-sm font-bold text-slate-500 mt-3">Father's Name: {student.fatherName}</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Session / Semester</p>
                <div className="bg-white px-4 py-1.5 rounded-xl border border-slate-200 text-xs font-black text-superior-teal shadow-sm">{student.session || 'Current'}</div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Contact Number</p>
                <p className="text-sm font-black text-slate-700">{student.contactNumber || student.contact}</p>
              </div>
            </div>
          </div>

          <Separator className="my-10 bg-slate-100 h-1" />

          {/* Ledger Statement */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-serif font-black text-slate-800 flex items-center gap-3">
                <CreditCard className="text-superior-teal" /> Financial Statement
                <span className="urdu-text text-lg text-slate-400 font-medium ml-4">مالی تفصیلات</span>
              </h3>
            </div>

            <div className="border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-800 text-white">
                  <TableRow className="hover:bg-slate-800 pointer-events-none">
                    <TableHead className="text-white font-black uppercase tracking-widest text-[10px] py-6 px-10">Particulars (تفصیلات)</TableHead>
                    <TableHead className="text-white font-black uppercase tracking-widest text-[10px] py-6 px-10 text-right">Amount (رقم)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-b">
                    <TableCell className="py-6 px-10 font-bold text-slate-700">Course / Tuition Fee (تالییمی فیس)</TableCell>
                    <TableCell className="py-6 px-10 text-right font-black text-slate-800">Rs. {tuitionFee.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="border-b">
                    <TableCell className="py-6 px-10 font-bold text-slate-700">Admission Fee (داخلہ فیس)</TableCell>
                    <TableCell className="py-6 px-10 text-right font-black text-slate-800">Rs. {admissionFee.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="border-b">
                    <TableCell className="py-6 px-10 font-bold text-slate-700">Miscellaneous Funds (متفرق فنڈز)</TableCell>
                    <TableCell className="py-6 px-10 text-right font-black text-slate-800">Rs. {miscFunds.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="bg-superior-teal/5">
                    <TableCell className="py-8 px-10">
                      <p className="font-black text-superior-teal text-xl">TOTAL PACKAGE (کل پیکج)</p>
                    </TableCell>
                    <TableCell className="py-8 px-10 text-right">
                      <p className="font-black text-superior-teal text-3xl">Rs. {totalPackage.toLocaleString()}</p>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50">
                    <TableCell className="py-8 px-10">
                      <p className="font-black text-emerald-600 text-xl tracking-wider">RECEIVED AMOUNT (وصول شدہ رقم)</p>
                    </TableCell>
                    <TableCell className="py-8 px-10 text-right">
                      <p className="font-black text-emerald-700 text-3xl">Rs. {feeReceived.toLocaleString()}</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="bg-rose-600 p-8 rounded-[3rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">REMAINING BALANCE (بقایا جات)</p>
                <p className="text-5xl font-black">Rs. {outstanding.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <AlertCircle size={48} className="text-white/20 mb-2 ml-auto" />
                <Badge className="bg-white/20 text-white font-black px-5 py-2 rounded-full uppercase tracking-widest text-[10px]">Attention Required</Badge>
              </div>
            </div>
          </div>

          <div className="mt-16 bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Important Notice (ضروری نوٹ)</h4>
            <ul className="text-[11px] text-slate-500 space-y-2 font-medium">
              <li className="flex gap-2"><span>1.</span> This receipt is computer generated and does not require a physical signature for verification.</li>
              <li className="flex gap-2"><span>2.</span> All fees are non-refundable as per the official policy.</li>
              <li className="flex gap-2"><span>3.</span> Please ensure the remaining balance of Rs. {outstanding.toLocaleString()} is cleared promptly.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="mt-24 flex justify-between">
            <div className="text-center w-64 border-t-2 border-slate-300 pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Accountant Signature</p>
            </div>
            <div className="text-center w-64 border-t-2 border-slate-800 pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Verified By Office</p>
            </div>
          </div>

          {/* Bottom Watermark */}
          <div className="absolute bottom-10 right-10 opacity-5 font-black text-6xl rotate-[-15deg] pointer-events-none text-superior-teal uppercase">
             Official Receipt
          </div>
        </div>
      </div>
    </div>
  );
}
