import * as React from 'react';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Database,
  ArrowRight,
  RefreshCw,
  X,
  CreditCard,
  School,
  GraduationCap,
  Layers,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MASTER_PROGRAMS,
  MASTER_ACADEMIC_GROUPS,
  resolveAcademicGroup,
  deriveSemesterAndPart,
  normalizeSessionString,
  buildDuplicateKey,
  MasterAcademicGroup
} from '../lib/academicMasterData';
import { Gender } from '../types';

export interface BulkImportCandidate {
  rowNum: number;
  fullName: string;
  fatherName: string;
  gender: Gender;
  contactNumber: string;
  fatherContact: string;
  bayFormNo: string;
  dob: string;
  previousClass: string;
  boardRollNo: string;
  previousMarks: number;
  previousSchool: string;
  rawGroup: string;
  resolvedGroup: MasterAcademicGroup | null;
  category: string;
  currentSemester: number;
  academicPart: 'Part-1' | 'Part-2';
  programType: 'Yearly' | 'Semester';
  section: string;
  session: string;
  admissionFee: number;
  miscFunds: number;
  tuitionFee: number;
  totalPackage: number;
  feeReceived: number;
  remainingBalance: number;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  dupKey: string;
}

interface BulkImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  defaultProgram?: 'inter' | 'bs' | 'dit' | 'ukl3';
  onImportComplete?: () => void;
}

export default function BulkImportWizard({
  isOpen,
  onClose,
  data,
  defaultProgram = 'inter',
  onImportComplete
}: BulkImportWizardProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [selectedProgram, setSelectedProgram] = useState<'inter' | 'bs' | 'dit' | 'ukl3'>(defaultProgram);
  const [targetSession, setTargetSession] = useState<string>(() => {
    return selectedProgram === 'bs' ? '2024-26' : MASTER_PROGRAMS[selectedProgram]?.defaultSession || '2026-28';
  });
  const [targetSection, setTargetSection] = useState<string>('Auto');

  const [fileName, setFileName] = useState<string>('');
  const [fileHash, setFileHash] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<BulkImportCandidate[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'invalid' | 'duplicate'>('all');
  const [isCommitting, setIsCommitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update target session default when program changes
  const handleProgramSelect = (prog: 'inter' | 'bs' | 'dit' | 'ukl3') => {
    setSelectedProgram(prog);
    const defSession = prog === 'bs' ? '2024-26' : MASTER_PROGRAMS[prog].defaultSession;
    setTargetSession(defSession);
  };

  // 1. Download official standardized import template
  const handleDownloadTemplate = (stream: 'inter' | 'bs' | 'dit' | 'ukl3' = selectedProgram) => {
    let sampleRows: any[] = [];
    if (stream === 'bs') {
      sampleRows = [
        {
          "Full Name": "Amina Bibi",
          "Father Name": "Muhammad Aslam",
          "Gender": "Female",
          "Academic Group": "BS Zoology",
          "Category": "BS Semester 8th",
          "Current Semester": 8,
          "Section": "BS-A",
          "Session": "2024-26",
          "Tuition Fee": 50000,
          "Admission Fee": 0,
          "Misc Funds": 1500,
          "Fee Received": 48000,
          "Contact Number": "03001234567",
          "Father Contact": "03009876543",
          "CNIC": "36103-1234567-2",
          "DOB": "2003-05-14",
          "Previous Class": "ADP",
          "Board Roll No": "54201"
        },
        {
          "Full Name": "Fatima Zahra",
          "Father Name": "Tariq Mahmood",
          "Gender": "Female",
          "Academic Group": "BS English",
          "Category": "BS Semester 8th",
          "Current Semester": 8,
          "Section": "BS-A",
          "Session": "2024-26",
          "Tuition Fee": 48000,
          "Admission Fee": 0,
          "Misc Funds": 1500,
          "Fee Received": 49500,
          "Contact Number": "03017654321",
          "Father Contact": "03012345678",
          "CNIC": "36103-7654321-4",
          "DOB": "2003-08-20",
          "Previous Class": "ADP",
          "Board Roll No": "54202"
        },
        {
          "Full Name": "Muhammad Bilal",
          "Father Name": "Shahid Ali",
          "Gender": "Male",
          "Academic Group": "BS Computer Science (BSCS)",
          "Category": "BS Semester 5th (ADP Lateral Entry)",
          "Current Semester": 5,
          "Section": "BS-CS",
          "Session": "2024-26",
          "Tuition Fee": 52000,
          "Admission Fee": 0,
          "Misc Funds": 2000,
          "Fee Received": 54000,
          "Contact Number": "03023456789",
          "Father Contact": "03029876543",
          "CNIC": "36103-9876543-1",
          "DOB": "2003-01-11",
          "Previous Class": "ADP",
          "Board Roll No": "54203"
        }
      ];
    } else {
      sampleRows = [
        {
          "Full Name": "Muhammad Ali",
          "Father Name": "Rashid Ahmad",
          "Gender": "Male",
          "Academic Group": "FSC (Pre Engineering)",
          "Category": "Inter Part-1 Boys",
          "Section": "A",
          "Session": "2026-28",
          "Tuition Fee": 65000,
          "Admission Fee": 5000,
          "Misc Funds": 3000,
          "Fee Received": 25000,
          "Contact Number": "03001122334",
          "Father Contact": "03009988776",
          "CNIC": "36103-1122334-1",
          "DOB": "2008-03-15",
          "Previous Class": "10th",
          "Board Roll No": "102938"
        },
        {
          "Full Name": "Zainab Bibi",
          "Father Name": "Muhammad Rafiq",
          "Gender": "Female",
          "Academic Group": "FSC (Premedical)",
          "Category": "Inter Part-1 Girls",
          "Section": "G-A",
          "Session": "2026-28",
          "Tuition Fee": 70000,
          "Admission Fee": 5000,
          "Misc Funds": 3000,
          "Fee Received": 30000,
          "Contact Number": "03014455667",
          "Father Contact": "03018877665",
          "CNIC": "36103-4455667-2",
          "DOB": "2008-07-22",
          "Previous Class": "10th",
          "Board Roll No": "102939"
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${stream.toUpperCase()} Template`);
    XLSX.writeFile(wb, `SCJ_${stream.toUpperCase()}_Import_Template.xlsx`);
    toast.success(`Official ${stream.toUpperCase()} Excel template downloaded!`);
  };

  // 2. Parse, Validate & Preview (Zero database writes)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        if (!jsonData || jsonData.length === 0) {
          toast.error("The selected file is empty!");
          return;
        }

        // Calculate a light hash string for duplicate file detection
        const rawString = JSON.stringify(jsonData);
        let hash = 0;
        for (let i = 0; i < Math.min(rawString.length, 5000); i++) {
          hash = (hash << 5) - hash + rawString.charCodeAt(i);
          hash |= 0;
        }
        const computedHash = `file-${file.size}-${hash}`;
        setFileHash(computedHash);

        // Pre-build DB student lookup for duplicate detection
        const existingStudentKeys = new Set<string>();
        const existingRolls = new Set<string>();
        const existingContacts = new Set<string>();

        (data?.students || []).forEach((s: any) => {
          if (s.fullName && s.fatherName) {
            existingStudentKeys.add(buildDuplicateKey(s.fullName, s.fatherName, s.session || targetSession, selectedProgram));
          }
          if (s.collegeNo) existingRolls.add(String(s.collegeNo).trim().toLowerCase());
          if (s.contact && s.contact.length >= 10) existingContacts.add(String(s.contact).replace(/\D/g, ''));
        });

        (data?.admissions || []).forEach((a: any) => {
          if (a.fullName && a.fatherName) {
            existingStudentKeys.add(buildDuplicateKey(a.fullName, a.fatherName, a.session || targetSession, selectedProgram));
          }
          if (a.collegeNo) existingRolls.add(String(a.collegeNo).trim().toLowerCase());
        });

        const seenInFile = new Set<string>();
        const candidates: BulkImportCandidate[] = [];

        jsonData.forEach((row, idx) => {
          const rowNum = idx + 2; // Excel row numbering
          const rawName = row["Full Name"] || row["Name"] || row["Student Name"] || "";
          const rawFather = row["Father Name"] || row["Father's Name"] || row["F/Name"] || "";
          const fullName = String(rawName).trim();
          const fatherName = String(rawFather).trim();

          const errors: string[] = [];

          if (!fullName) errors.push("Missing Full Name");
          if (!fatherName) errors.push("Missing Father Name");

          // Gender
          const rawGender = String(row["Gender"] || row["Sex"] || "").trim().toLowerCase();
          let gender: Gender = "Male";
          if (["female", "girl", "f", "larki", "women"].includes(rawGender)) gender = "Female";
          else if (["male", "boy", "m", "larka", "men"].includes(rawGender)) gender = "Male";
          else if (rawGender) errors.push(`Invalid Gender "${row["Gender"]}" (Must be Male or Female)`);

          // Academic Group matching
          const rawGroup = String(row["Academic Group"] || row["Program/Group"] || row["Group"] || row["Subject"] || row["subjects"] || "").trim();
          const resolvedGroup = resolveAcademicGroup(rawGroup, selectedProgram);

          if (!rawGroup) {
            errors.push("Missing Academic Group");
          } else if (!resolvedGroup) {
            errors.push(`Unknown Academic Group "${rawGroup}". Valid options: BS Zoology, BS English, BSCS, Pre-Medical, etc.`);
          }

          // Category & Semester derivation
          const rawCategory = String(row["Category"] || row["Class"] || row["Semester"] || "").trim();
          const derived = deriveSemesterAndPart(rawCategory, rawGroup, row["Previous Class"]);

          // Check if explicit Current Semester column provided
          let currentSemester = derived.currentSemester;
          if (row["Current Semester"] !== undefined && row["Current Semester"] !== "") {
            const parsedSem = Number(row["Current Semester"]);
            if (!isNaN(parsedSem) && parsedSem >= 1 && parsedSem <= 8) {
              currentSemester = parsedSem;
            }
          }

          // Fees breakdown
          const tuitionFee = Number(row["Tuition Fee"] || row["Semester Fee"] || row["totalFeeFinalized"] || row["Package"] || row["pakage"] || 0);
          const admissionFee = Number(row["Admission Fee"] || row["Registration Fee"] || row["registrion Fee"] || 0);
          const miscFunds = Number(row["Misc Funds"] || row["Funds"] || 0);
          const totalPackage = Number(row["Total Package"] || row["Package"] || row["pakage"] || (tuitionFee + admissionFee + miscFunds));
          const feeReceived = Number(row["Fee Received"] || row["Paid Amount"] || row["Paid Amont"] || row["Paid"] || 0);
          const remainingBalance = Math.max(0, totalPackage - feeReceived);

          // Target Session from Wizard (NEVER ALL OR BLANK)
          const rowSession = normalizeSessionString(row["Session"] || targetSession, targetSession);

          // Section
          const rowSection = targetSection !== 'Auto' 
            ? targetSection 
            : String(row["Section"] || row["Sec"] || (gender === 'Female' ? 'Girls Section' : 'A')).trim();

          // Duplicate key check
          const dupKey = buildDuplicateKey(fullName, fatherName, rowSession, selectedProgram);
          let isDuplicate = false;
          let duplicateReason = "";

          if (seenInFile.has(dupKey)) {
            isDuplicate = true;
            duplicateReason = "Duplicate row inside this Excel file";
          } else if (existingStudentKeys.has(dupKey)) {
            isDuplicate = true;
            duplicateReason = `Already enrolled in college database (${rowSession})`;
          }
          seenInFile.add(dupKey);

          candidates.push({
            rowNum,
            fullName,
            fatherName,
            gender,
            contactNumber: String(row["Contact Number"] || row["Cell NO"] || row["Phone"] || "").trim(),
            fatherContact: String(row["Father Contact"] || row["Guardian WhatsApp"] || "").trim(),
            bayFormNo: String(row["CNIC"] || row["Bay Form No"] || row["B-Form"] || "").trim(),
            dob: String(row["Date of Birth"] || row["DOB"] || "").trim(),
            previousClass: String(row["Previous Class"] || (selectedProgram === 'bs' ? 'ADP' : '10th')).trim(),
            boardRollNo: String(row["Board Roll No"] || row["Roll No"] || "").trim(),
            previousMarks: Number(row["Previous Marks"] || row["Marks"] || 0),
            previousSchool: String(row["Previous School"] || row["College"] || "").trim(),
            rawGroup,
            resolvedGroup,
            category: rawCategory || (selectedProgram === 'bs' ? `BS Semester ${currentSemester}${currentSemester === 1 ? 'st' : currentSemester === 2 ? 'nd' : currentSemester === 3 ? 'rd' : 'th'}` : (gender === 'Female' ? 'Inter Part-1 Girls' : 'Inter Part-1 Boys')),
            currentSemester,
            academicPart: derived.academicPart,
            programType: derived.programType,
            section: rowSection,
            session: rowSession,
            admissionFee,
            miscFunds,
            tuitionFee,
            totalPackage,
            feeReceived,
            remainingBalance,
            isValid: errors.length === 0,
            errors,
            isDuplicate,
            duplicateReason,
            dupKey
          });
        });

        setParsedRows(candidates);
        setStep('preview');
        toast.success(`Parsed ${candidates.length} rows. Please review validation preview.`);
      } catch (err: any) {
        console.error("Excel parse error:", err);
        toast.error(`Failed to parse file: ${err.message || 'Invalid Excel format'}`);
      }
    };

    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 3. Confirm & Commit to Database
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      toast.error("No valid non-duplicate rows to import!");
      return;
    }

    setIsCommitting(true);
    const toastId = toast.loading(`Committing ${validRows.length} students to database...`);

    try {
      const admissionsPayload: any[] = [];

      validRows.forEach((row, i) => {
        const studentId = data.generateStudentId(row.resolvedGroup?.name || selectedProgram);
        const initialTransactions = row.feeReceived > 0 ? [{
          id: `tx-imp-${Date.now()}-${i}`,
          date: new Date().toISOString().split('T')[0],
          amount: row.feeReceived,
          description: 'Initial Fee Payment via Import',
          paymentMethod: 'Cash',
          receiptId: `REC-IMP-${Math.floor(Date.now() / 1000).toString().slice(-6)}`
        }] : [];

        const initialFeeLedger = {
          totalPackage: row.totalPackage,
          totalReceived: row.feeReceived,
          remainingBalance: row.remainingBalance,
          installments: [],
          transactions: initialTransactions
        };

        admissionsPayload.push({
          id: `adm-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          studentId: row.feeReceived > 0 ? studentId : undefined,
          fullName: row.fullName,
          fatherName: row.fatherName,
          gender: row.gender,
          contactNumber: row.contactNumber,
          fatherContact: row.fatherContact,
          bayFormNo: row.bayFormNo,
          dob: row.dob || null,
          previousClass: row.previousClass,
          boardRollNo: row.boardRollNo,
          previousMarks: row.previousMarks,
          previousSchool: row.previousSchool,
          group: row.resolvedGroup?.name || row.rawGroup,
          category: row.category,
          section: row.section,
          session: row.session,
          currentSemester: row.currentSemester,
          academicPart: row.academicPart,
          programType: row.programType,
          admissionFee: row.admissionFee,
          miscFunds: row.miscFunds,
          totalFeeFinalized: row.tuitionFee,
          totalPackage: row.totalPackage,
          feeReceived: row.feeReceived,
          paymentPlan: row.programType === 'Semester' ? 'Semester' : 'Installments',
          reference: 'Bulk Import Confirmed',
          address: '',
          subjects: row.resolvedGroup?.subjects || [],
          date: new Date().toISOString().split('T')[0],
          dateApplied: new Date().toISOString().split('T')[0],
          status: row.feeReceived > 0 ? 'Admitted/Confirmed' : 'Prospective',
          isAdmitted: row.feeReceived > 0,
          feeLedger: initialFeeLedger,
          feeHistory: row.feeReceived > 0 ? [{
            id: `fee-imp-${Date.now()}-${i}`,
            month: 'Admission',
            year: new Date().getFullYear(),
            amountDue: row.totalPackage,
            amountPaid: row.feeReceived,
            status: row.remainingBalance === 0 ? 'Paid' : 'Partial',
            datePaid: new Date().toISOString().split('T')[0],
            receiptId: `REC-IMP-${Math.floor(Date.now() / 1000).toString().slice(-6)}`
          }] : []
        });
      });

      // Commit to admissions via centralized handler
      await data.importAdmissions(admissionsPayload);

      // Save imported file hash to settings to prevent duplicate uploads
      try {
        const existingHashes = data.settings?.config?.importHistory || [];
        await data.updateSettings?.({
          config: {
            ...(data.settings?.config || {}),
            importHistory: [...existingHashes, { hash: fileHash, name: fileName, count: validRows.length, date: new Date().toISOString() }]
          }
        });
      } catch (e) {}

      toast.dismiss(toastId);
      toast.success(`Successfully imported ${validRows.length} students! Database and ledgers refreshed.`);
      if (onImportComplete) onImportComplete();
      onClose();
    } catch (err: any) {
      console.error("Confirm Import Error:", err);
      toast.dismiss(toastId);
      toast.error(`Import failed: ${err.message || 'Database commit error'}`);
    } finally {
      setIsCommitting(false);
    }
  };

  // Preview Aggregates
  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;

  const validRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
  const totalPackageSum = validRows.reduce((acc, r) => acc + r.totalPackage, 0);
  const totalReceivedSum = validRows.reduce((acc, r) => acc + r.feeReceived, 0);
  const totalBalanceSum = validRows.reduce((acc, r) => acc + r.remainingBalance, 0);

  const displayedRows = parsedRows.filter(r => {
    if (filterMode === 'valid') return r.isValid && !r.isDuplicate;
    if (filterMode === 'invalid') return !r.isValid;
    if (filterMode === 'duplicate') return r.isDuplicate;
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1600px] w-[98vw] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-3xl border-none shadow-2xl bg-white dark:bg-slate-900">
        {/* Top Landscape Header */}
        <div className="bg-gradient-to-r from-superior-teal to-teal-900 text-white p-5 sm:p-6 shrink-0 border-b border-teal-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-white">
                  Student Bulk Import Engine
                </h2>
                <Badge className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5">
                  Three-Stage Verification Flow
                </Badge>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Upload → Zero-Write Validation Preview → Verified Database Commit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadTemplate(selectedProgram)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>Download {selectedProgram.toUpperCase()} Template</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-xl"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* STEP 1: UPLOAD & CONFIGURATION SCREEN */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Program & Stream Selection Row */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                1. Select Target Educational Stream
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['inter', 'bs', 'dit', 'ukl3'] as const).map(progKey => {
                  const p = MASTER_PROGRAMS[progKey];
                  const isSelected = selectedProgram === progKey;
                  return (
                    <button
                      key={progKey}
                      type="button"
                      onClick={() => handleProgramSelect(progKey)}
                      className={cn(
                        "p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3",
                        isSelected
                          ? "border-superior-teal bg-white dark:bg-slate-800 shadow-md scale-102"
                          : "border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase text-superior-teal font-mono">
                          {p.code}
                        </span>
                        {isSelected && <CheckCircle2 size={18} className="text-superior-teal" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">{p.boardOrUniversity}</p>
                      </div>
                      <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] w-fit">
                        Default Session: {p.defaultSession}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Session & Section Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <span>Target Academic Session (مخصوص سیشن)</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Independent of Page Filter</span>
                </Label>
                <Select value={targetSession} onValueChange={setTargetSession}>
                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900 font-bold font-mono text-superior-teal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-26">2024-26 (BS Lateral ADP Session)</SelectItem>
                    <SelectItem value="2026-28">2026-28 (Inter / Diploma Default)</SelectItem>
                    <SelectItem value="2026-30">2026-30 (BS 4-Year Intake)</SelectItem>
                    <SelectItem value="2025-2027">2025-2027</SelectItem>
                    <SelectItem value="2024-2026">2024-2026</SelectItem>
                    <SelectItem value="2023-2025">2023-2025</SelectItem>
                    <SelectItem value="2025-29">2025-29</SelectItem>
                    <SelectItem value="2024-28">2024-28</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Target session will be assigned to all rows that do not specify a row-level session. Never saved as "all" or blank.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                  Section Assignment Rule
                </Label>
                <Select value={targetSection} onValueChange={setTargetSection}>
                  <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900 font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Auto">Auto-detect from file (or by Gender)</SelectItem>
                    <SelectItem value="BS-A">BS-A (Lateral)</SelectItem>
                    <SelectItem value="BS-B">BS-B</SelectItem>
                    <SelectItem value="A">Section A</SelectItem>
                    <SelectItem value="B">Section B</SelectItem>
                    <SelectItem value="Girls Section">Girls Campus Section</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400">
                  Auto-detect reads the "Section" column from Excel or assigns based on gender.
                </p>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="space-y-3">
              <Label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                2. Select or Drop File (.xlsx, .xls, .csv)
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-teal-500/40 hover:border-superior-teal bg-teal-50/20 dark:bg-slate-800/60 p-10 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-700 shadow-md flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet size={32} className="text-superior-teal dark:text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Click to select Excel file or drag and drop here
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Supports standard college roster workbooks with Full Name, Father Name, Academic Group (e.g. BS Zoology, BS English, BSCS), Category/Semester, Tuition Fee, and Fee Received.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VALIDATION & PREVIEW SCREEN (ZERO DATABASE WRITES) */}
        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Top Stat Ribbon & Filter Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 shrink-0">
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Rows</span>
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">{totalCount}</p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Valid Rows</span>
                <p className="text-xl font-black font-mono text-emerald-800 dark:text-emerald-300">{validCount}</p>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">Invalid Errors</span>
                <p className="text-xl font-black font-mono text-rose-800 dark:text-rose-300">{errorCount}</p>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Duplicates</span>
                <p className="text-xl font-black font-mono text-amber-800 dark:text-amber-300">{duplicateCount}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-400">Package Sum</span>
                <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100">Rs. {totalPackageSum.toLocaleString()}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-emerald-600">Received Sum</span>
                <p className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">Rs. {totalReceivedSum.toLocaleString()}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-amber-600">Balance Sum</span>
                <p className="text-lg font-black font-mono text-amber-700 dark:text-amber-400">Rs. {totalBalanceSum.toLocaleString()}</p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterMode === 'all' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  All Rows ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('valid')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    filterMode === 'valid' ? "bg-emerald-600 text-white shadow-2xs" : "text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  Valid Ready ({validCount})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('invalid')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      filterMode === 'invalid' ? "bg-rose-600 text-white shadow-2xs" : "text-rose-700 dark:text-rose-400"
                    )}
                  >
                    Errors ({errorCount})
                  </button>
                )}
                {duplicateCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode('duplicate')}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                      filterMode === 'duplicate' ? "bg-amber-600 text-white shadow-2xs" : "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    Duplicates ({duplicateCount})
                  </button>
                )}
              </div>

              <span className="text-xs text-slate-500 font-mono">
                Target Session: <strong className="text-superior-teal">{targetSession}</strong> · Stream: <strong className="text-superior-teal">{selectedProgram.toUpperCase()}</strong>
              </span>
            </div>

            {/* Interactive Preview Table */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Row</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father Name</th>
                    <th className="py-2.5 px-3">Group (Saved Exact)</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Sem</th>
                    <th className="py-2.5 px-3 text-center">Sec</th>
                    <th className="py-2.5 px-3 text-right">Package Fee</th>
                    <th className="py-2.5 px-3 text-right">Received</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3">Validation Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {displayedRows.map((row) => (
                    <tr
                      key={row.rowNum}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                        !row.isValid ? "bg-rose-50/30 dark:bg-rose-950/20" : row.isDuplicate ? "bg-amber-50/30 dark:bg-amber-950/20" : ""
                      )}
                    >
                      <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{row.rowNum}</td>
                      <td className="py-2 px-3">
                        {!row.isValid ? (
                          <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] gap-1">
                            <AlertCircle size={10} /> Error
                          </Badge>
                        ) : row.isDuplicate ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] gap-1">
                            <AlertTriangle size={10} /> Duplicate
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] gap-1">
                            <CheckCircle2 size={10} /> Valid Ready
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{row.fullName}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{row.fatherName}</td>
                      <td className="py-2 px-3 font-bold text-superior-teal dark:text-emerald-400 font-mono">
                        {row.resolvedGroup?.name || row.rawGroup}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{row.category}</td>
                      <td className="py-2 px-3 text-center font-bold font-mono text-superior-teal">
                        {row.currentSemester}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{row.section}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        Rs. {row.totalPackage.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                        Rs. {row.feeReceived.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-600">
                        Rs. {row.remainingBalance.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        {!row.isValid ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{row.errors.join('; ')}</span>
                        ) : row.isDuplicate ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{row.duplicateReason}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Passed · Target Session: {row.session}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bottom Landscape Action Footer */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          {step === 'preview' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStep('upload');
                setParsedRows([]);
              }}
              className="rounded-xl h-10 px-4 text-xs font-bold gap-1.5"
            >
              <RefreshCw size={14} /> Back to File Upload
            </Button>
          ) : (
            <div className="text-xs text-slate-400">
              Only valid non-duplicate rows will be committed to the database.
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-10 px-5 text-xs font-bold"
            >
              Cancel
            </Button>

            {step === 'preview' && (
              <Button
                type="button"
                disabled={validCount === 0 || isCommitting}
                onClick={handleConfirmImport}
                className="bg-superior-teal hover:bg-superior-teal/90 text-white font-bold text-xs rounded-xl h-10 px-6 gap-2 shadow-lg cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>
                  {isCommitting ? "Committing to Database..." : `Confirm & Commit (${validCount} Students)`}
                </span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
