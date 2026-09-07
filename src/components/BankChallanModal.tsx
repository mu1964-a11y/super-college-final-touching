import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download, Building2, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BankChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[]; // single student or array for batch printing
  settings?: any;
}

const BANK_PRESETS = [
  {
    id: "meezan",
    name: "Meezan Bank Limited",
    branch: "Jahanian Branch (Code: 0412)",
    accountTitle: "SUPERIOR GROUP OF COLLEGES JAHANIAN",
    accountNo: "0102-0104882190",
    iban: "PK56MEZN0001020104882190",
  },
  {
    id: "hbl",
    name: "Habib Bank Limited (HBL)",
    branch: "Main Branch Jahanian",
    accountTitle: "SUPERIOR GROUP OF COLLEGES JAHANIAN",
    accountNo: "1892-79018442-03",
    iban: "PK44HABB0018927901844203",
  },
  {
    id: "bop",
    name: "The Bank of Punjab (BOP)",
    branch: "Quaid-e-Azam Road, Jahanian",
    accountTitle: "SUPERIOR GROUP OF COLLEGES JAHANIAN",
    accountNo: "6510-1849204-001",
    iban: "PK19BPUN65101849204001",
  },
  {
    id: "nbp",
    name: "National Bank of Pakistan (NBP)",
    branch: "Tehsil Complex Jahanian",
    accountTitle: "SUPERIOR GROUP OF COLLEGES JAHANIAN",
    accountNo: "0194-2849102-8",
    iban: "PK72NBPA019428491028",
  },
];

export default function BankChallanModal({
  isOpen,
  onClose,
  students,
  settings,
}: BankChallanModalProps) {
  const [selectedBankId, setSelectedBankId] = useState("meezan");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });
  const [lateFeeFine, setLateFeeFine] = useState("500");
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !students || students.length === 0) return null;

  const activeBank =
    BANK_PRESETS.find((b) => b.id === selectedBankId) || BANK_PRESETS[0];

  const handlePrint = () => {
    window.print();
  };

  const getChallanNo = (student: any, idx: number) => {
    const year = new Date().getFullYear();
    const cleanId = String(student.collegeNo || student.id || "0000").replace(
      /\D/g,
      ""
    );
    return `SCJ-${year}-${cleanId.slice(-4) || String(idx + 1).padStart(4, "0")}`;
  };

  const calculatePayable = (student: any) => {
    const balance =
      (Number(student.totalPackage || 0) - Number(student.feeReceived || 0));
    if (balance > 0) {
      return Math.min(balance, Math.max(5000, Math.round(balance / 2)));
    }
    return Number(student.monthlyFee || 8000);
  };

  const numberToWords = (num: number): string => {
    if (!num || isNaN(num)) return "Zero Rupees Only";
    return `Rupees ${num.toLocaleString()} Only`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-slate-100 border-0 shadow-2xl">
        {/* Header / Controls */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="text-emerald-600" size={20} />
              3-Copy Official Bank Challan Generator
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {students.length} {students.length === 1 ? "Challan" : "Challans (Batch)"}
              </span>
            </DialogTitle>
            <p className="text-xs text-slate-500 font-medium">
              Standard 3-Part Layout (Bank Copy | College Copy | Student Copy)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                Bank:
              </Label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger className="h-8 w-44 text-xs font-bold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANK_PRESETS.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs font-semibold">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                Due Date:
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 w-36 text-xs font-bold bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-bold text-slate-600 whitespace-nowrap">
                Late Fine:
              </Label>
              <Input
                type="number"
                value={lateFeeFine}
                onChange={(e) => setLateFeeFine(e.target.value)}
                className="h-8 w-20 text-xs font-bold bg-white"
                placeholder="500"
              />
            </div>

            <Button
              onClick={handlePrint}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 shadow-sm"
            >
              <Printer size={14} />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Challan Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-200/70">
          <div ref={printRef} className="space-y-8 print:space-y-0 print:m-0">
            {students.map((student, sIdx) => {
              const challanNo = getChallanNo(student, sIdx);
              const payable = calculatePayable(student);
              const lateFine = Number(lateFeeFine) || 0;
              const totalAfterDue = payable + lateFine;
              const copies = [
                { label: "BANK COPY", bg: "bg-emerald-50", border: "border-emerald-600" },
                { label: "COLLEGE COPY", bg: "bg-blue-50", border: "border-blue-600" },
                { label: "STUDENT COPY", bg: "bg-purple-50", border: "border-purple-600" },
              ];

              return (
                <div
                  key={student.id || sIdx}
                  className="bg-white rounded-2xl shadow-md border border-slate-300 p-5 mx-auto max-w-[1050px] print:rounded-none print:shadow-none print:border-0 print:p-2 print:page-break-after"
                >
                  {/* Print Styles */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      body * {
                        visibility: hidden;
                      }
                      .print-challan-container, .print-challan-container * {
                        visibility: visible;
                      }
                      .print-challan-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                      }
                      @page {
                        size: A4 landscape;
                        margin: 6mm;
                      }
                    }
                  `}} />

                  {/* 3 Columns for 3 Copies */}
                  <div className="print-challan-container grid grid-cols-3 gap-3 divide-x divide-dashed divide-slate-300">
                    {copies.map((copy, cIdx) => (
                      <div
                        key={cIdx}
                        className={`text-[11px] leading-tight flex flex-col justify-between ${cIdx > 0 ? "pl-3" : ""}`}
                      >
                        {/* Copy Header */}
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                            <div>
                              <p className="font-black text-[12px] tracking-tight text-emerald-950 uppercase">
                                SUPERIOR COLLEGE
                              </p>
                              <p className="text-[9px] font-bold text-slate-600 uppercase">
                                Jahanian Campus
                              </p>
                            </div>
                            <span
                              className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${copy.bg} ${copy.border}`}
                            >
                              {copy.label}
                            </span>
                          </div>

                          {/* Bank Information Block */}
                          <div className="bg-slate-50 border border-slate-200 rounded p-1.5 mb-2">
                            <p className="font-black text-[10px] text-slate-800">{activeBank.name}</p>
                            <p className="text-[9px] text-slate-500 font-semibold">{activeBank.branch}</p>
                            <div className="flex justify-between items-center text-[9px] mt-0.5 font-bold">
                              <span>A/C: <span className="font-mono text-slate-800">{activeBank.accountNo}</span></span>
                            </div>
                          </div>

                          {/* Challan Metadata */}
                          <div className="grid grid-cols-2 gap-1 text-[9px] border-b border-slate-200 pb-1.5 mb-2">
                            <div>
                              <span className="text-slate-400 font-semibold block">Challan No:</span>
                              <span className="font-mono font-black text-slate-800">{challanNo}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-semibold block">Due Date:</span>
                              <span className="font-bold text-rose-600">{dueDate}</span>
                            </div>
                          </div>

                          {/* Student Particulars */}
                          <div className="space-y-1 border-b border-slate-200 pb-2 mb-2 text-[9.5px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Student Name:</span>
                              <span className="font-black text-slate-800 truncate max-w-[130px]">
                                {student.fullName}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Father Name:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[130px]">
                                {student.fatherName || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Roll / Reg No:</span>
                              <span className="font-mono font-black text-emerald-800">
                                {student.collegeNo || student.id}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 font-medium">Class / Section:</span>
                              <span className="font-bold text-slate-700">
                                {student.group || student.category || "Inter"} ({student.section || "A"})
                              </span>
                            </div>
                          </div>

                          {/* Itemized Fee Breakdown Table */}
                          <div className="border border-slate-300 rounded overflow-hidden mb-2">
                            <table className="w-full text-[9px]">
                              <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-300">
                                <tr>
                                  <th className="py-1 px-1.5 text-left">Particulars</th>
                                  <th className="py-1 px-1.5 text-right">Amount (Rs.)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 font-semibold">
                                <tr>
                                  <td className="py-1 px-1.5 text-slate-700">Tuition / Installment</td>
                                  <td className="py-1 px-1.5 text-right font-mono">{payable.toLocaleString()}</td>
                                </tr>
                                <tr>
                                  <td className="py-1 px-1.5 text-slate-500">Exam / Lab Charges</td>
                                  <td className="py-1 px-1.5 text-right font-mono text-slate-400">0</td>
                                </tr>
                                <tr className="bg-slate-50 font-black text-[9.5px]">
                                  <td className="py-1 px-1.5 text-slate-900">Within Due Date:</td>
                                  <td className="py-1 px-1.5 text-right font-mono text-emerald-700">
                                    Rs. {payable.toLocaleString()}
                                  </td>
                                </tr>
                                <tr className="text-rose-600 font-medium text-[8.5px]">
                                  <td className="py-0.5 px-1.5">Late Fee Surcharge:</td>
                                  <td className="py-0.5 px-1.5 text-right font-mono">+ {lateFine}</td>
                                </tr>
                                <tr className="bg-rose-50 font-black text-[9.5px] border-t border-rose-200">
                                  <td className="py-1 px-1.5 text-rose-900">After Due Date:</td>
                                  <td className="py-1 px-1.5 text-right font-mono text-rose-700">
                                    Rs. {totalAfterDue.toLocaleString()}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <p className="text-[8px] text-slate-500 italic mb-2">
                            In Words: <span className="font-semibold">{numberToWords(payable)}</span>
                          </p>
                        </div>

                        {/* Footer & Signature Boxes */}
                        <div className="pt-2 border-t border-slate-200">
                          <div className="grid grid-cols-2 gap-2 text-center text-[8px] text-slate-500 mb-1">
                            <div className="border-t border-dashed border-slate-400 pt-1">
                              Depositor Signature
                            </div>
                            <div className="border-t border-dashed border-slate-400 pt-1">
                              Bank Cashier / Stamp
                            </div>
                          </div>
                          <p className="text-[7.5px] text-slate-400 text-center uppercase tracking-tighter">
                            Fee once paid is non-refundable • Bank copy must be forwarded
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
