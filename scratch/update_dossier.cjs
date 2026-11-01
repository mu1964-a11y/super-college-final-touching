const fs = require('fs');

let content = fs.readFileSync('src/components/StudentDossier360.tsx', 'utf8');

// 1. Add VoucherCollectPaymentModal import
if (!content.includes('VoucherCollectPaymentModal')) {
  content = content.replace(
    "import BankChallanModal from './BankChallanModal';",
    "import BankChallanModal from './BankChallanModal';\nimport VoucherCollectPaymentModal from './VoucherCollectPaymentModal';"
  );
}

// 2. Ensure Receipt is imported from lucide-react
if (!content.includes('Receipt,')) {
  content = content.replace(
    "import { \n  X, User,",
    "import { \n  Receipt, X, User,"
  );
}

// 3. Add formatLedgerDate function
const formatLedgerDateFunc = `
function formatLedgerDate(rawDate: string | Date | undefined): string {
  if (!rawDate) return 'Recorded';
  if (rawDate instanceof Date) {
    return isNaN(rawDate.getTime()) ? 'Recorded' : rawDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  const str = String(rawDate).trim();
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) {
    const [y, m, d] = str.split('T')[0].split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  const dmMatch = str.match(/^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{2,4})$/);
  if (dmMatch) {
    const day = parseInt(dmMatch[1], 10);
    const month = parseInt(dmMatch[2], 10) - 1;
    let year = parseInt(dmMatch[3], 10);
    if (year < 100) year += 2000;
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  const standardDate = new Date(str);
  if (!isNaN(standardDate.getTime())) {
    return standardDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return str;
}
`;

if (!content.includes('function formatLedgerDate')) {
  content = content.replace(
    "export default function StudentDossier360({",
    `${formatLedgerDateFunc}\nexport default function StudentDossier360({`
  );
}

// 4. Add state for isCollectPaymentOpen
if (!content.includes('isCollectPaymentOpen')) {
  content = content.replace(
    "const [isChallanOpen, setIsChallanOpen] = useState(false);",
    "const [isChallanOpen, setIsChallanOpen] = useState(false);\n  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);"
  );
}

// 5. Add Collect Fee Button in top header action buttons
const headerButtonTarget = `{/* 1. Send Fee Alert (3D Emerald Button) */}`;
const collectHeaderBtn = `{/* 0. Collect Fee / Record Payment (Mandatory Voucher Audit) */}
                <button
                  type="button"
                  onClick={() => setIsCollectPaymentOpen(true)}
                  className="flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl h-9 px-4 shadow-[0_4px_14px_rgba(245,158,11,0.35)] hover:shadow-[0_6px_18px_rgba(245,158,11,0.45)] flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Receipt size={14} />
                  <span>Collect Fee</span>
                </button>

                {/* 1. Send Fee Alert (3D Emerald Button) */}`;

if (!content.includes('Collect Fee</span>') && content.includes(headerButtonTarget)) {
  content = content.replace(headerButtonTarget, collectHeaderBtn);
}

// 6. In Financial Ledger tab, add "Collect Fee / Record Payment" button next to 3-Copy Bank Challan
const challanBtnTarget = `<button
                        type="button"
                        onClick={() => setIsChallanOpen(true)}
                        className="border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold rounded-xl h-8 px-3 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Building2 size={12} /> 3-Copy Bank Challan
                      </button>`;

const collectTabBtn = `<button
                        type="button"
                        onClick={() => setIsCollectPaymentOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl h-8 px-3.5 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
                      >
                        <Receipt size={13} /> Collect Fee (Voucher Verified)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsChallanOpen(true)}
                        className="border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold rounded-xl h-8 px-3 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Building2 size={12} /> 3-Copy Bank Challan
                      </button>`;

if (content.includes(challanBtnTarget) && !content.includes('Collect Fee (Voucher Verified)')) {
  content = content.replace(challanBtnTarget, collectTabBtn);
}

// 7. Add BS Progression Card & Inter Part-2 Banner in Financials tab
const financialsTabStart = `{/* TAB 2: FINANCIALS & LEDGER */}
            {activeTab === 'financials' && (
              <div className="space-y-6 animate-in fade-in duration-200">`;

const bsAndP2Cards = `{/* TAB 2: FINANCIALS & LEDGER */}
            {activeTab === 'financials' && (() => {
              const isBsStudent = Boolean(
                (student.category && student.category.toUpperCase().includes('BS')) ||
                (student.section && student.section.toUpperCase().includes('BS')) ||
                (student.group && student.group.toUpperCase().includes('BS'))
              );
              const isPart2Student = Boolean(
                (student.session && student.session.includes('2025-27')) ||
                (student.academicPart === 'Part-2') ||
                (student.category && student.category.includes('Part-2')) ||
                (student.section && (student.section.includes('-G2') || student.section.includes('-B2')))
              );

              const curSem = student.currentSemester || student.feeLedger?.currentSemester || 6;
              const semFee = student.feeLedger?.semesterFee || 18000;
              const semPkg = curSem * semFee;
              const advanceSurplus = Math.max(0, totalReceived - semPkg);

              return (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* BS SEMESTER PROGRESSION CARD */}
                {isBsStudent && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-emerald-950 text-white border border-teal-800/60 shadow-lg space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={18} className="text-teal-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-teal-200">
                          BS Semester Academic & Financial Progression
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="bg-teal-500/20 text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-400/30">
                          Current: Semester {curSem} (of 8)
                        </span>
                        <span className="bg-emerald-500/20 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-400/30">
                          Rs. {semFee.toLocaleString()} / Semester
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Total Sem Package</span>
                        <p className="text-base font-black text-white mt-0.5">Rs. {semPkg.toLocaleString()}</p>
                        <span className="text-[9px] text-teal-300">{curSem} Semesters Completed</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Total Received</span>
                        <p className="text-base font-black text-emerald-400 mt-0.5">Rs. {totalReceived.toLocaleString()}</p>
                        <span className="text-[9px] text-emerald-300">All Installments Paid</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Remaining Balance</span>
                        <p className="text-base font-black text-white mt-0.5">Rs. {remainingBalance.toLocaleString()}</p>
                        <span className="text-[9px] text-emerald-400 font-bold">100% Cleared (NIL)</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Surplus / Advance</span>
                        <p className="text-base font-black text-amber-300 mt-0.5">Rs. {advanceSurplus.toLocaleString()}</p>
                        <span className="text-[9px] text-amber-200">Carried Forward</span>
                      </div>
                    </div>

                    {/* Semester Milestones Roadmap */}
                    <div className="pt-1 space-y-1">
                      <span className="text-[9px] font-bold uppercase text-slate-400">Semester Completion Milestones:</span>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 text-[9px] font-bold text-center">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sNum => {
                          const isDone = sNum <= curSem;
                          return (
                            <div
                              key={sNum}
                              className={\`py-1 px-1 rounded-lg border \${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-white/5 text-slate-500 border-white/10'
                              }\`}
                            >
                              Sem {sNum} {isDone ? '✓' : ''}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* INTER PART-2 CLEARANCE & PROMOTION BANNER */}
                {isPart2Student && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="font-black text-emerald-900 dark:text-emerald-200">
                          Part-1 (Session 2024-25) Dues: 100% Cleared & Promoted
                        </span>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          Student promoted to 2nd Year. Only current Part-2 dues are active.
                        </p>
                      </div>
                    </div>
                    <span className="bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200 font-bold px-2.5 py-1 rounded-xl text-[10px]">
                      Part-2 Active Session 2025-27
                    </span>
                  </div>
                )}`;

if (content.includes(financialsTabStart) && !content.includes('BS Semester Academic & Financial Progression')) {
  content = content.replace(financialsTabStart, bsAndP2Cards);
  // Also close the wrapper function at the end of financials tab
  const financialsTabEnd = `{/* Transaction History Table */}
                <div className="space-y-3">`;
  content = content.replace(financialsTabEnd, financialsTabEnd);
  // Find where tab 2 ends
  content = content.replace(
    `                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ACADEMICS */}`,
    `                  </div>
                </div>
              </div>
              );
            })()}

            {/* TAB 3: ACADEMICS */}`
  );
}

// 8. Fix Table Cell date parsing with formatLedgerDate
content = content.replace(
  "{tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recorded'}",
  "{formatLedgerDate(tx.date)}"
);

// 9. Render VoucherCollectPaymentModal at the bottom
const bottomChallanModal = `{/* 3-Copy Bank Challan Modal */}`;
const collectModalBlock = `{/* Audit-Verified Fee Collection Modal */}
      {isCollectPaymentOpen && (
        <VoucherCollectPaymentModal
          isOpen={isCollectPaymentOpen}
          onClose={() => setIsCollectPaymentOpen(false)}
          student={student}
          data={data}
        />
      )}

      {/* 3-Copy Bank Challan Modal */}`;

if (!content.includes('VoucherCollectPaymentModal') || !content.includes('isCollectPaymentOpen && (')) {
  content = content.replace(bottomChallanModal, collectModalBlock);
}

fs.writeFileSync('src/components/StudentDossier360.tsx', content, 'utf8');
console.log('Successfully updated StudentDossier360.tsx!');
