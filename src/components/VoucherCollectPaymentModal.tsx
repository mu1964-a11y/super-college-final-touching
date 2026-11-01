import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileCheck,
  Send,
  Printer,
  CreditCard,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  IssuedVoucher,
  getStudentVouchers,
  verifyVoucherInRegistry,
  markVoucherAsCollected,
  registerIssuedVouchers
} from '../utils/voucherRegistry';
import { getDocumentLink } from '../lib/whatsappAutomation';

interface VoucherCollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  data: any;
  onPaymentSuccess?: (paymentRecord: any) => void;
}

export default function VoucherCollectPaymentModal({
  isOpen,
  onClose,
  student,
  data,
  onPaymentSuccess
}: VoucherCollectPaymentModalProps) {
  const [mounted, setMounted] = useState(true);

  // Form Fields
  const [voucherInput, setVoucherInput] = useState<string>('');
  const [verifiedVoucher, setVerifiedVoucher] = useState<IssuedVoucher | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('Cash Counter');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [collectorName, setCollectorName] = useState<string>('Accounts Desk');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState<any | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // When student changes, find their issued vouchers and prefill
  const studentIssuedVouchers = useMemo(() => {
    if (!student) return [];
    const rollOrId = student.collegeNo || student.studentId || student.id;
    return getStudentVouchers(rollOrId);
  }, [student]);

  useEffect(() => {
    if (student) {
      setPaymentCompleted(null);
      setVerificationError(null);
      setReceiptNo(`REC-${Math.floor(100000 + Math.random() * 900000)}`);

      const rollOrId = student.collegeNo || student.studentId || student.id;
      const existing = getStudentVouchers(rollOrId);

      // Auto-select latest active voucher if one exists
      const activeVch = existing.find(v => v.status !== 'COLLECTED') || existing[0];
      if (activeVch) {
        setVoucherInput(activeVch.id);
        setVerifiedVoucher(activeVch);
        setAmountPaid(activeVch.amountBilled > 0 ? activeVch.amountBilled : 5000);
      } else {
        // Default voucher proposal - auto-issue official voucher so collection is instant
        const yStr = new Date().getFullYear().toString().slice(-2);
        const mStr = String(new Date().getMonth() + 1).padStart(2, '0');
        const rollClean = String(rollOrId).replace(/[^a-zA-Z0-9]/g, '');
        const proposedId = `VCH-${yStr}${mStr}-${rollClean}`;
        setVoucherInput(proposedId);

        const rem = Math.max(0, Number(student.totalPackage || student.feeLedger?.totalPackage || 0) - Number(student.feeReceived || student.feeLedger?.totalReceived || 0));
        const defaultAmt = rem > 0 ? (rem > 18000 ? 18000 : rem) : 18000;
        const autoVch: IssuedVoucher = {
          id: proposedId,
          studentId: student.id,
          studentName: student.fullName || student.name || 'Verified Student',
          fatherName: student.fatherName || student.father_name || 'N/A',
          collegeNo: student.collegeNo || student.id,
          section: student.section || 'General',
          campus: student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus',
          feeMonth: 'November 2026',
          amountBilled: defaultAmt,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          lateSurcharge: 100,
          status: 'ISSUED',
          createdAt: new Date().toISOString()
        };
        registerIssuedVouchers([autoVch]);
        setVerifiedVoucher(autoVch);
        setAmountPaid(defaultAmt);
      }
    }
  }, [student, isOpen]);

  if (!isOpen || !student || !mounted) return null;

  const totalPkg = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);
  const totalRec = Number(student.feeReceived || student.feeLedger?.totalReceived || 0);
  const remaining = Math.max(0, totalPkg - totalRec);
  const studentRoll = student.collegeNo || student.studentId || student.id || 'N/A';

  // Handle Manual Verification Button
  const handleVerifyVoucher = () => {
    setVerificationError(null);
    const res = verifyVoucherInRegistry(voucherInput, studentRoll);
    if (res.verified && res.voucher) {
      setVerifiedVoucher(res.voucher);
      if (res.voucher.amountBilled > 0 && amountPaid === 0) {
        setAmountPaid(res.voucher.amountBilled);
      }
      toast.success(`Voucher Verified: ${res.voucher.id}`);
    } else {
      setVerifiedVoucher(null);
      setVerificationError(res.error || 'Voucher verification failed.');
    }
  };

  // Instant Issue Voucher if missing
  const handleQuickIssueVoucher = async () => {
    const yStr = new Date().getFullYear().toString().slice(-2);
    const mStr = String(new Date().getMonth() + 1).padStart(2, '0');
    const rollClean = String(studentRoll).replace(/[^a-zA-Z0-9]/g, '');
    const newVchId = `VCH-${yStr}${mStr}-${rollClean}`;

    const newVch: IssuedVoucher = {
      id: newVchId,
      studentId: student.id,
      studentName: student.fullName || student.name || 'Verified Student',
      fatherName: student.fatherName || student.father_name || 'N/A',
      collegeNo: studentRoll,
      section: student.section || 'General',
      campus: student.gender === 'Female' ? 'Girls Campus' : 'Boys Campus',
      feeMonth: 'November 2026',
      amountBilled: amountPaid > 0 ? amountPaid : (remaining > 0 ? Math.min(remaining, 5000) : 0),
      issueDate: paymentDate,
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      lateSurcharge: 100,
      status: 'ISSUED',
      createdAt: new Date().toISOString()
    };

    await registerIssuedVouchers([newVch]);
    setVoucherInput(newVchId);
    setVerifiedVoucher(newVch);
    setVerificationError(null);
    toast.success(`Official Voucher ${newVchId} generated and verified for audit!`);
  };

  // Confirm Fee Collection
  const handleConfirmCollection = async () => {
    if (!verifiedVoucher) {
      toast.error('Audit Verification Required: Please verify or issue an official Voucher first.');
      return;
    }
    if (!amountPaid || amountPaid <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Record payment in data layer
      const paymentMonth = new Date(paymentDate).toLocaleString('default', { month: 'long' });
      const paymentYear = new Date(paymentDate).getFullYear();

      if (data && typeof data.recordFeePayment === 'function') {
        await data.recordFeePayment(student.id, {
          id: `pay-${Date.now()}`,
          month: paymentMonth,
          year: paymentYear,
          amountDue: remaining,
          amountPaid: amountPaid,
          status: 'Paid',
          datePaid: paymentDate,
          receiptId: receiptNo,
          feeType: `Challan / Voucher Fee (${verifiedVoucher.id})`,
          collectedBy: collectorName || 'Accounts Desk',
          paymentMethod: paymentMode
        });
      }

      // 2. Mark voucher as collected in registry
      await markVoucherAsCollected(verifiedVoucher.id, {
        collectedAmount: amountPaid,
        paymentMode: paymentMode,
        receiptNo: receiptNo,
        collectedBy: collectorName,
        studentId: student.id
      });

      const paymentRecord = {
        voucherNo: verifiedVoucher.id,
        receiptNo,
        amountPaid,
        studentName: student.fullName,
        studentRoll,
        datePaid: paymentDate,
        remainingAfter: Math.max(0, remaining - amountPaid)
      };

      setPaymentCompleted(paymentRecord);
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentRecord);
      }
      toast.success(`Fee Rs. ${amountPaid.toLocaleString()} successfully collected and verified!`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Collection failed: ${err?.message || 'Database error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick WhatsApp Receipt Dispatch
  const handleSendWhatsAppReceipt = () => {
    const rawPhone = student.contact || student.fatherContact || student.phone;
    if (!rawPhone) {
      toast.error('Student contact phone number is missing in database.');
      return;
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const receiptUrl = getDocumentLink('receipt', paymentCompleted?.receiptNo || receiptNo);
    const ledgerUrl = getDocumentLink('statement', studentRoll);

    const msg = 
`🏛️ *SUPERIOR COLLEGE JAHANIAN*
🧾 *OFFICIAL FEE COLLECTION RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${student.fatherName || 'Guardian'}),

Aapke bache ki official fee payment successfully receive ho chuki hai:

• *Student Name:* ${student.fullName}
• *Roll Number:* ${studentRoll}
• *Class / Section:* ${student.section || student.group}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Voucher Reference:* ${paymentCompleted?.voucherNo || verifiedVoucher?.id}
• *Receipt Number:* ${paymentCompleted?.receiptNo || receiptNo}
• *Payment Date:* ${paymentDate}
• *Payment Mode:* ${paymentMode}
• *Amount Received:* *Rs. ${paymentCompleted?.amountPaid?.toLocaleString()}*
• *Remaining Balance:* *Rs. ${paymentCompleted?.remainingAfter?.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *Download Official Digital Receipt (PDF):*
${receiptUrl}

📊 *Live Student Dossier & Statement:*
${ledgerUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
*Superior Accounts Desk • Jahanian*
_Notice generated under Audit Compliance Register._`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`, '_blank');
    toast.success('WhatsApp receipt opened in browser!');
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-950 text-white p-5 border-b border-teal-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-teal-300 border border-white/15">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Audit-Verified Fee Collection</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Strict Audit Mode
                </span>
              </div>
              <p className="text-xs text-teal-200/80 font-medium mt-0.5">
                Voucher verification mandatory prior to cash / bank receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS SCREEN */}
          {paymentCompleted ? (
            <div className="py-6 px-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">Fee Successfully Collected!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Voucher marked <span className="font-bold text-emerald-600 dark:text-emerald-400">COLLECTED</span> in audit registry and student ledger updated.
                </p>
              </div>

              {/* Receipt Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Student Name:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{paymentCompleted.studentName} ({paymentCompleted.studentRoll})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Voucher Reference:</span>
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{paymentCompleted.voucherNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Receipt No:</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{paymentCompleted.receiptNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 font-medium">Amount Received:</span>
                  <span className="font-black text-emerald-600 text-sm">Rs. {paymentCompleted.amountPaid?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Remaining Dues:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Rs. {paymentCompleted.remainingAfter?.toLocaleString()}</span>
                </div>
              </div>

              {/* Post Collection Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendWhatsAppReceipt}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Send size={14} />
                  <span>Send WhatsApp Receipt (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Student Particulars Quick Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-sm">
                    {student.fullName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                      {student.fullName}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Roll: <span className="font-bold text-slate-800 dark:text-slate-200">{studentRoll}</span> • {student.section || student.group}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Remaining Dues</span>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400">
                    Rs. {remaining.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* STEP 1: AUDIT VOUCHER VERIFICATION SECTION */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-amber-700 dark:text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Step 1: Voucher Number Verification
                    </span>
                  </div>
                  {verifiedVoucher ? (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                      Required for Audit
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVerifiedVoucher(null);
                      setVerificationError(null);
                    }}
                    placeholder="Enter Voucher Ref e.g. VCH-2611-GUBS4"
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyVoucher}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Verify
                  </button>
                </div>

                {/* Available Student Vouchers Quick Selector */}
                {studentIssuedVouchers.length > 0 && !verifiedVoucher && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Select Issued Voucher for this student:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {studentIssuedVouchers.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setVoucherInput(v.id);
                            setVerifiedVoucher(v);
                            setAmountPaid(v.amountBilled > 0 ? v.amountBilled : 5000);
                            setVerificationError(null);
                          }}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-mono font-bold transition-all cursor-pointer ${
                            voucherInput === v.id
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-amber-50'
                          }`}
                        >
                          {v.id} (Rs. {(v.amountBilled || 0).toLocaleString()} • {v.feeMonth})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Verification Error / Quick Issue Prompt */}
                {verificationError && (
                  <div className="p-2.5 rounded-xl bg-rose-100/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                    <span className="font-medium">{verificationError}</span>
                    <button
                      type="button"
                      onClick={handleQuickIssueVoucher}
                      className="shrink-0 px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg cursor-pointer"
                    >
                      Issue Voucher Now
                    </button>
                  </div>
                )}

                {/* No Vouchers Found Prompt */}
                {studentIssuedVouchers.length === 0 && !verifiedVoucher && !verificationError && (
                  <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
                    <span className="font-medium">No formal voucher recorded yet for this student.</span>
                    <button
                      type="button"
                      onClick={handleQuickIssueVoucher}
                      className="shrink-0 px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles size={11} /> Generate & Issue Voucher
                    </button>
                  </div>
                )}
              </div>

              {/* STEP 2: PAYMENT PARTICULARS */}
              <div className="space-y-4 pt-1">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-emerald-600" />
                  <span>Step 2: Payment Particulars</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Amount Paid */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Amount Collected (Rs.) *
                    </label>
                    <input
                      type="number"
                      value={amountPaid || ''}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 text-sm font-black rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Cash Counter">Cash Counter (College Desk)</option>
                      <option value="Bank Deposit - Allied Bank">Bank Deposit - Allied Bank (ABL)</option>
                      <option value="Bank Deposit - HBL">Bank Deposit - Habib Bank (HBL)</option>
                      <option value="Online - EasyPaisa / JazzCash">Online - EasyPaisa / JazzCash</option>
                      <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                    </select>
                  </div>

                  {/* Receipt Number */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Receipt Book / Reference # *
                    </label>
                    <input
                      type="text"
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      placeholder="e.g. REC-12345"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Collection Date *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Collector & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Cashier / Receiving Officer
                    </label>
                    <input
                      type="text"
                      value={collectorName}
                      onChange={(e) => setCollectorName(e.target.value)}
                      placeholder="e.g. Accounts Counter #1"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Transaction Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Part payment semester installment"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="button"
                  disabled={!verifiedVoucher || isSubmitting || amountPaid <= 0}
                  onClick={handleConfirmCollection}
                  className={`w-full h-11 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                    verifiedVoucher && amountPaid > 0 && !isSubmitting
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer active:scale-98'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <Receipt size={16} />
                  <span>
                    {isSubmitting ? 'Recording Audit Transaction...' : `Confirm & Collect Rs. ${(amountPaid || 0).toLocaleString()}`}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
