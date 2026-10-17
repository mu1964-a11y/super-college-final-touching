import React, { useRef, useState } from "react";
import { 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  User, 
  Briefcase, 
  GraduationCap, 
  Phone, 
  CreditCard, 
  Fingerprint, 
  Building2,
  FileText
} from "lucide-react";
import { Staff } from "../types";
import { Button } from "@/components/ui/button";
import { exportElementToPdf } from "../utils/documentExporter";
import { toast } from "sonner";

interface StaffJoiningDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  brandingSettings?: {
    collegeName?: string;
    campusName?: string;
    logo?: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    website?: string;
    principalName?: string;
  };
}

export default function StaffJoiningDossierModal({
  isOpen,
  onClose,
  staff,
  brandingSettings = {},
}: StaffJoiningDossierModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !staff) return null;

  const collegeName = brandingSettings.collegeName || "Superior Group of Colleges";
  const campusName = brandingSettings.campusName || "Jahanian Campus";
  const logo = brandingSettings.logo || "/superior-logo.png";
  const principalName = brandingSettings.principalName || "Prof. Muhammad Azam";
  const joinDateFormatted = staff.joinDate 
    ? new Date(staff.joinDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Official Enrollment";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExporting(true);
      toast.loading("Rendering high-resolution official PDF...", { id: "export-staff-pdf" });
      await exportElementToPdf(printAreaRef.current, {
        filename: `${staff.id}_${staff.fullName.replace(/\s+/g, "_")}_Joining_Dossier.pdf`,
        format: "a4",
        orientation: "portrait",
        marginMm: 6,
        pixelRatio: 2.5,
      });
      toast.success("Joining dossier PDF downloaded successfully!", { id: "export-staff-pdf" });
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. You can also use the Print button to Save as PDF.", { id: "export-staff-pdf" });
    } finally {
      setIsExporting(false);
    }
  };

  const secondaryRole = staff.secondaryRole || (staff.designation && staff.designation.includes("&") ? staff.designation.split("&")[1].trim() : "");
  const fullDesignation = staff.designation || (secondaryRole ? `${staff.role} & ${secondaryRole}` : staff.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Container Card */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Controls Bar (Hidden during print) */}
        <div className="p-4 sm:px-6 bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#04332c] text-white flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText size={20} className="text-[#c9a84c]" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Staff Joining Dossier & Employment Record</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30">
                  {staff.id}
                </span>
              </h3>
              <p className="text-xs text-emerald-100/80">
                Official institutional profile sheet with verified roles, qualifications & signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white border-white/25 rounded-xl font-bold text-xs h-9 gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Form</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="bg-[#c9a84c] hover:bg-[#b8973d] text-slate-950 font-black text-xs rounded-xl h-9 px-4 gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>{isExporting ? "Rendering..." : "Download PDF"}</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-100 dark:bg-slate-950/60 print:p-0 print:bg-white">
          <div 
            ref={printAreaRef}
            className="w-full max-w-[820px] bg-white text-slate-900 p-8 sm:p-10 shadow-lg print:shadow-none border border-slate-200 print:border-none rounded-2xl print:rounded-none relative font-sans leading-relaxed text-[13px]"
            style={{ minHeight: "1050px" }}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
              <span className="text-[120px] font-black tracking-widest text-[#085a4e] uppercase rotate-[-25deg]">
                SUPERIOR
              </span>
            </div>

            {/* Official Header Strip */}
            <div className="border-b-2 border-[#085a4e] pb-5 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
                    {logo ? (
                      <img src={logo} alt="College Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={36} className="text-[#085a4e]" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#085a4e] tracking-tight uppercase">
                      {collegeName}
                    </h1>
                    <p className="text-sm font-bold text-slate-700 tracking-wide">
                      {campusName} &bull; Empowering Success Since Inception
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Main Multan Road, Jahanian &bull; Ph: 0300-1234567 &bull; Session 2026-28
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-[#085a4e] font-mono font-black text-xs rounded-lg border border-emerald-200">
                    ID: {staff.id}
                  </span>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-700">
                    <ShieldCheck size={13} />
                    <span>Verified Official Record</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Issued: {new Date().toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              {/* Document Banner */}
              <div className="mt-4 py-1.5 px-4 rounded-xl bg-gradient-to-r from-[#085a4e] to-[#04332c] text-white flex items-center justify-between shadow-xs">
                <span className="font-black text-xs tracking-wider uppercase">
                  STAFF JOINING FORM & EMPLOYMENT DOSSIER
                </span>
                <span className="text-[11px] font-bold text-[#c9a84c]">
                  Status: {staff.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Profile Overview Card (with Photo) */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="w-28 h-32 rounded-xl border-2 border-slate-300 bg-white overflow-hidden shadow-xs shrink-0 flex flex-col items-center justify-center text-slate-400 relative">
                {staff.photo ? (
                  <img src={staff.photo} alt={staff.fullName} className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <User size={36} className="text-slate-300 mb-1" />
                    <span className="text-[9px] uppercase font-bold text-slate-400">Passport Photo</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[8px] font-mono py-0.5 text-center">
                  {staff.id}
                </div>
              </div>

              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Full Name</span>
                  <span className="text-base font-black text-slate-900">{staff.fullName}</span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Father's Name</span>
                  <span className="text-sm font-bold text-slate-800">{staff.fatherName || "N/A"}</span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Primary Institutional Role</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#085a4e]/10 text-[#085a4e] font-black text-xs mt-0.5 border border-[#085a4e]/20">
                    <Briefcase size={12} /> {staff.role}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Secondary / Teaching Role</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs mt-0.5 border border-emerald-200">
                    <GraduationCap size={12} /> {secondaryRole || "Not Applicable (Staff)"}
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Official Full Designation</span>
                  <span className="text-xs font-black text-slate-800">{fullDesignation}</span>
                </div>

                <div>
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Date of Joining College</span>
                  <span className="text-xs font-black text-[#085a4e] flex items-center gap-1.5 mt-0.5">
                    <Calendar size={13} /> {joinDateFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Personal & Contact Dossier */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#085a4e] pb-1 border-b border-slate-200 mb-3 flex items-center gap-1.5">
                <User size={14} /> Section 1: Personal & Contact Credentials
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CNIC / ID Card</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{staff.cnic || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact / Mobile</span>
                  <span className="text-xs font-mono font-bold text-slate-800">{staff.contact || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                  <span className="text-xs font-bold text-slate-800">{staff.dob || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Academic Qualification</span>
                  <span className="text-xs font-bold text-slate-800">{staff.qualification || "M.Sc / M.Phil"}</span>
                </div>
                <div className="col-span-2 sm:col-span-4 mt-1 pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Residential Address</span>
                  <span className="text-xs text-slate-700">{staff.address || "Jahanian, District Khanewal, Punjab"}</span>
                </div>
              </div>
            </div>

            {/* Section 2: Teaching Subjects & Academic Allocation */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#085a4e] pb-1 border-b border-slate-200 mb-3 flex items-center gap-1.5">
                <GraduationCap size={14} /> Section 2: Academic Subjects & Teaching Allocation
              </h3>
              <div className="p-3.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                {staff.subjects && staff.subjects.length > 0 ? (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                      Assigned Subjects ({staff.subjects.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.subjects.map((sub, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-teal-50 text-[#085a4e] border border-teal-200 text-xs font-bold">
                          ✓ {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Administrative / Non-teaching profile. No classroom teaching subjects assigned.
                  </p>
                )}
              </div>
            </div>

            {/* Section 3: Remuneration & Biometric Attendance Record */}
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#085a4e] pb-1 border-b border-slate-200 mb-3 flex items-center gap-1.5">
                <CreditCard size={14} /> Section 3: Remuneration & Biometric Gate Credentials
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Agreed Base Salary</span>
                  <span className="text-base font-black text-[#085a4e]">
                    Rs. {(staff.baseSalary || staff.salary || 0).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Biometric Fingerprint Status</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-xs mt-1">
                    {staff.fingerprintTemplate ? (
                      <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Fingerprint size={13} />
                        <span>Enrolled ({staff.fingerprintFinger || "R. Thumb"})</span>
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Fingerprint size={13} />
                        <span>Enrollment Pending</span>
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Method</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1">
                    Biometric Fingerprint & Tablet Facial Recognition
                  </span>
                </div>
              </div>
            </div>

            {/* Section 4: Institutional Declaration & Signatures */}
            <div className="border-t-2 border-slate-300 pt-5 mt-auto">
              <p className="text-[10.5px] text-slate-500 leading-normal mb-8">
                <strong>INSTITUTIONAL UNDERTAKING:</strong> I hereby declare that all provided personal, academic, and professional details are true and authentic to the best of my knowledge. I agree to abide by the institutional code of conduct, punctuality regulations, and academic ethics established by Superior Group of Colleges.
              </p>

              <div className="grid grid-cols-3 gap-6 text-center pt-4">
                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-slate-800">{staff.fullName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Employee Signature & Date</p>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-slate-800">HR / Administrative Desk</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Verified By / Stamp</p>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-[#085a4e]">{principalName}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Principal / Executive Seal</p>
                </div>
              </div>
            </div>

            {/* Bottom Security Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
              <span>SGC-J Human Resources Management & Payroll Division</span>
              <span className="font-mono">DOC-REF: {staff.id}-2026-REG</span>
              <span>Confidential Institutional Archive</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
