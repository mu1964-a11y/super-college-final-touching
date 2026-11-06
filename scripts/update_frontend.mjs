import fs from 'fs';

console.log('Updating frontend files for verified sections and ledger...');

// 1. Update src/hooks/useSupabaseData.ts
let useSupabaseCode = fs.readFileSync('src/hooks/useSupabaseData.ts', 'utf-8');

// Replace .limit(3000) on student attendance
useSupabaseCode = useSupabaseCode.replace(
  /\.from\('student_attendance'\)\s*\.select\('\*'\)\s*\.order\('date',\s*\{\s*ascending:\s*false\s*\}\)\s*\.limit\(\d+\)/g,
  ".from('student_attendance').select('*').order('date', { ascending: false }).range(0, 10000)"
);

// Replace .limit(2000) on staff attendance
useSupabaseCode = useSupabaseCode.replace(
  /\.from\('staff_attendance'\)\s*\.select\('\*'\)\s*\.order\('date',\s*\{\s*ascending:\s*false\s*\}\)\s*\.limit\(\d+\)/g,
  ".from('staff_attendance').select('*').order('date', { ascending: false }).range(0, 10000)"
);

// In mappedStudents, ensure remainingBalance respects precalculated balance
useSupabaseCode = useSupabaseCode.replace(
  /remainingBalance:\s*Math\.max\(0,\s*Number\(s\.total_package\s*\?\?\s*linkedAdmission\?\.total_package\s*\?\?\s*0\)\s*-\s*Number\(s\.fee_received\s*\?\?\s*linkedAdmission\?\.fee_received\s*\?\?\s*0\)\)/g,
  "remainingBalance: s.fee_ledger?.combined_Remaining_Balance !== undefined ? Number(s.fee_ledger.combined_Remaining_Balance) : (s.fee_ledger?.remainingBalance !== undefined ? Number(s.fee_ledger.remainingBalance) : Math.max(0, Number(s.total_package ?? linkedAdmission?.total_package ?? 0) - Number(s.fee_received ?? linkedAdmission?.fee_received ?? 0)))"
);

fs.writeFileSync('src/hooks/useSupabaseData.ts', useSupabaseCode, 'utf-8');
console.log('✓ Updated useSupabaseData.ts');

// 2. Update src/components/DashboardView.tsx
let dashCode = fs.readFileSync('src/components/DashboardView.tsx', 'utf-8');

const oldDashPattern = `    (data.students || []).forEach((s: any) => {
      const sec = s.section ? \`Sec \${s.section}\` : (s.group ? s.group : "Class A");
      const prog = s.category || "FSc";
      const key = \`\${prog} \${sec}\`;

      if (!sectionMap[key]) {
        sectionMap[key] = {
          name: key,
          count: 0,
          totalPkg: 0,
          received: 0,
          program: prog,
          boys: 0,
          girls: 0,
        };
      }`;

const newDashReplacement = `    (data.students || []).forEach((s: any) => {
      const secName = s.section || s.feeLedger?.exactSectionName || (s.feeLedger?.sectionId ? \`Sec \${s.feeLedger.sectionId}\` : "Unassigned");
      const secId = s.feeLedger?.sectionId || '';
      const campus = s.feeLedger?.campus || '';
      const prog = s.category || s.feeLedger?.program || "General";
      const isAspire = campus && campus.includes('Aspire');
      const displayName = isAspire ? \`\${secName} (Aspire)\` : secName;
      const key = secId ? \`\${secId} - \${displayName}\` : displayName;

      if (!sectionMap[key]) {
        sectionMap[key] = {
          name: displayName,
          count: 0,
          totalPkg: 0,
          received: 0,
          program: prog,
          boys: 0,
          girls: 0,
        };
      }`;

dashCode = dashCode.replace(oldDashPattern, newDashReplacement);
// Also handle CRLF
dashCode = dashCode.replace(oldDashPattern.replace(/\n/g, '\r\n'), newDashReplacement.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/DashboardView.tsx', dashCode, 'utf-8');
console.log('✓ Updated DashboardView.tsx');

// 3. Update src/components/StudentsView.tsx for strict section matching
let stuCode = fs.readFileSync('src/components/StudentsView.tsx', 'utf-8');

stuCode = stuCode.replace(
  `const matchesSection = sectionFilter === 'all' || (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();`,
  `const matchesSection = sectionFilter === 'all' || 
        (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.sectionId || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.exactSectionName || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();`
);
stuCode = stuCode.replace(
  `const matchesSection = sectionFilter === 'all' || (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();`.replace(/\n/g, '\r\n'),
  `const matchesSection = sectionFilter === 'all' || 
        (s.section || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.sectionId || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.exactSectionName || '').trim().toLowerCase() === sectionFilter.trim().toLowerCase();`.replace(/\n/g, '\r\n')
);

fs.writeFileSync('src/components/StudentsView.tsx', stuCode, 'utf-8');
console.log('✓ Updated StudentsView.tsx');

// 4. Update src/components/FeeManagementView.tsx for strict section matching
let feeCode = fs.readFileSync('src/components/FeeManagementView.tsx', 'utf-8');

feeCode = feeCode.replace(
  `      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() ===
          sectionFilter.trim().toLowerCase();`,
  `      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.sectionId || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.exactSectionName || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase();`
);
feeCode = feeCode.replace(
  `      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() ===
          sectionFilter.trim().toLowerCase();`.replace(/\n/g, '\r\n'),
  `      const matchesSection =
        sectionFilter === "all" ||
        (s.section || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.sectionId || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase() ||
        (s.feeLedger?.exactSectionName || "").trim().toLowerCase() === sectionFilter.trim().toLowerCase();`.replace(/\n/g, '\r\n')
);

fs.writeFileSync('src/components/FeeManagementView.tsx', feeCode, 'utf-8');
console.log('✓ Updated FeeManagementView.tsx');

// 5. Update src/components/StudentDossier360.tsx to add P1/P2/Combined cards and Running Balance in ledger table
let dosCode = fs.readFileSync('src/components/StudentDossier360.tsx', 'utf-8');

const oldTableHead = `<TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Receipt / Month</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Amount Paid</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Date & Time</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>`;

const newTableHead = `<TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Receipt / Month</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Amount Paid</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Running Balance</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Date & Time</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>`;

dosCode = dosCode.replace(oldTableHead, newTableHead);
dosCode = dosCode.replace(oldTableHead.replace(/\n/g, '\r\n'), newTableHead.replace(/\n/g, '\r\n'));

const oldCellPaid = `<TableCell className="text-right font-black text-emerald-600 text-xs">
                                Rs. {(tx.amount || 0).toLocaleString()}
                              </TableCell>`;

const newCellPaid = `<TableCell className="text-right font-black text-emerald-600 text-xs">
                                Rs. {(tx.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">
                                {tx.runningBalance !== undefined ? \`Rs. \${Number(tx.runningBalance).toLocaleString()}\` : '-'}
                              </TableCell>`;

dosCode = dosCode.replace(oldCellPaid, newCellPaid);
dosCode = dosCode.replace(oldCellPaid.replace(/\n/g, '\r\n'), newCellPaid.replace(/\n/g, '\r\n'));

// Add Year-wise & Phase breakdown cards in StudentDossier360
const oldPart2Banner = `{/* INTER PART-2 CLEARANCE & PROMOTION BANNER */}`;

const newPart2Banner = `{/* 2-YEAR / MULTI-YEAR VERIFIED BREAKDOWN (P1 vs P2 vs OTHER) */}
                {Boolean(student.feeLedger?.p1_1stYear_Package || student.feeLedger?.p2_2ndYear_Package) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white border border-teal-800/60 shadow-lg space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-teal-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-teal-200">
                          Academic Phase & Year-Wise Fee Structure
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="bg-teal-500/20 text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-teal-400/30">
                          Section: {student.section || student.feeLedger?.exactSectionName || '-'} ({student.feeLedger?.sectionId || ''})
                        </span>
                        {student.feeLedger?.campus && (
                          <span className="bg-slate-700 text-slate-300 font-semibold px-2 py-0.5 rounded-full">
                            {student.feeLedger.campus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-center">
                      {/* P1 (1st Year) */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-teal-300">1st Year (Part 1 / Phase 1)</span>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-slate-300 font-medium">Package: <span className="font-bold text-white">Rs. {(student.feeLedger?.p1_1stYear_Package || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-emerald-400 font-medium">Paid: <span className="font-bold">Rs. {(student.feeLedger?.p1_1stYear_Paid || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-amber-300 font-medium">Remaining: <span className="font-bold">Rs. {(student.feeLedger?.p1_1stYear_Remaining || 0).toLocaleString()}</span></p>
                        </div>
                      </div>

                      {/* P2 (2nd Year) */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[10px] uppercase font-bold text-teal-300">2nd Year (Part 2 / Phase 2)</span>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-slate-300 font-medium">Package: <span className="font-bold text-white">Rs. {(student.feeLedger?.p2_2ndYear_Package || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-emerald-400 font-medium">Paid: <span className="font-bold">Rs. {(student.feeLedger?.p2_2ndYear_Paid || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-rose-300 font-medium">Remaining: <span className="font-bold">Rs. {(student.feeLedger?.p2_2ndYear_Remaining || 0).toLocaleString()}</span></p>
                        </div>
                      </div>

                      {/* Combined Total */}
                      <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
                        <span className="text-[10px] uppercase font-bold text-emerald-300">Combined Total Ledger</span>
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs text-slate-300 font-medium">Total Package: <span className="font-bold text-white">Rs. {(student.feeLedger?.combined_Total_Package || student.totalPackage || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-emerald-400 font-medium">Tuition Paid: <span className="font-bold">Rs. {(student.feeLedger?.combined_Tuition_Paid || student.feeReceived || 0).toLocaleString()}</span></p>
                          <p className="text-xs text-rose-400 font-medium">Combined Balance: <span className="font-bold">Rs. {(student.feeLedger?.combined_Remaining_Balance ?? remainingBalance).toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>

                    {Boolean(student.feeLedger?.otherFeesPaid) && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs">
                        <span className="text-amber-200 font-medium">
                          Other / Ancillary Fees Paid: <strong className="text-amber-100">Rs. {Number(student.feeLedger.otherFeesPaid).toLocaleString()}</strong>
                        </span>
                        {student.feeLedger.otherFeesReceiptsDates && (
                          <span className="text-[10px] text-amber-300/80 font-mono truncate max-w-[60%]">
                            Receipts/Dates: {student.feeLedger.otherFeesReceiptsDates}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* INTER PART-2 CLEARANCE & PROMOTION BANNER */}`;

dosCode = dosCode.replace(oldPart2Banner, newPart2Banner);
dosCode = dosCode.replace(oldPart2Banner.replace(/\n/g, '\r\n'), newPart2Banner.replace(/\n/g, '\r\n'));

fs.writeFileSync('src/components/StudentDossier360.tsx', dosCode, 'utf-8');
console.log('✓ Updated StudentDossier360.tsx');

console.log('All frontend updates applied successfully!');
