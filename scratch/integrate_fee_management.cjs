const fs = require('fs');

let content = fs.readFileSync('src/components/FeeManagementView.tsx', 'utf8');

// 1. Add imports
if (!content.includes('VoucherCollectPaymentModal')) {
  content = content.replace(
    'import BankChallanModal from "./BankChallanModal";',
    `import BankChallanModal from "./BankChallanModal";
import VoucherCollectPaymentModal from "./VoucherCollectPaymentModal";
import {
  getIssuedVouchers,
  syncVouchersFromSupabase,
  generateVoucherAuditPdf,
  registerIssuedVouchers,
  IssuedVoucher,
} from "../utils/voucherRegistry";`
  );
}

// 2. Ensure ShieldCheck is in lucide imports
if (!content.includes('ShieldCheck,')) {
  content = content.replace(
    '  Receipt,\n} from "lucide-react";',
    '  Receipt,\n  ShieldCheck,\n} from "lucide-react";'
  );
}

// 3. Add states for voucher audit and collection modal
const stateTarget = 'const [isChallanModalOpen, setIsChallanModalOpen] = React.useState(false);';
const newStates = `const [isChallanModalOpen, setIsChallanModalOpen] = React.useState(false);
  const [isVoucherCollectOpen, setIsVoucherCollectOpen] = React.useState(false);
  const [voucherCollectStudent, setVoucherCollectStudent] = React.useState<any | null>(null);
  const [auditVouchersList, setAuditVouchersList] = React.useState<IssuedVoucher[]>([]);
  const [auditMonthFilter, setAuditMonthFilter] = React.useState<string>("All Months");
  const [auditStatusFilter, setAuditStatusFilter] = React.useState<string>("all");
  const [auditSearchQuery, setAuditSearchQuery] = React.useState<string>("");`;

if (!content.includes('isVoucherCollectOpen') && content.includes(stateTarget)) {
  content = content.replace(stateTarget, newStates);
}

// 4. Add useEffect to load & pre-populate vouchers
const effectHook = `
  // Sync & populate vouchers for audit register
  React.useEffect(() => {
    syncVouchersFromSupabase().then((vchs) => {
      if (vchs && vchs.length > 0) {
        setAuditVouchersList(vchs);
      } else if (students && students.length > 0) {
        const initVchs: IssuedVoucher[] = students.slice(0, 200).map((st: any) => {
          const pkg = Number(st.totalPackage || st.feeLedger?.totalPackage || 0);
          const rec = Number(st.feeReceived || st.feeLedger?.totalReceived || 0);
          const rem = Math.max(0, pkg - rec);
          const rollClean = String(st.collegeNo || st.id || "101").replace(/[^a-zA-Z0-9]/g, "");
          const isClr = rem <= 200;
          return {
            id: \`VCH-2611-\${rollClean}\`,
            studentId: st.id,
            studentName: st.fullName || st.name || "Student",
            fatherName: st.fatherName || "N/A",
            collegeNo: st.collegeNo || st.id,
            section: st.section || "General",
            campus: st.gender === "Female" ? "Girls Campus" : "Boys Campus",
            feeMonth: "November 2026",
            amountBilled: rem > 0 ? (rem > 18000 ? 18000 : rem) : 18000,
            issueDate: "2026-11-01",
            dueDate: "2026-11-10",
            lateSurcharge: 100,
            status: isClr ? "COLLECTED" : "ISSUED",
            collectedAmount: isClr ? rec : 0,
            collectedDate: isClr ? "2026-11-01" : undefined,
            createdAt: new Date().toISOString(),
          };
        });
        registerIssuedVouchers(initVchs);
        setAuditVouchersList(initVchs);
      }
    });
  }, [students]);
`;

if (!content.includes('Sync & populate vouchers for audit register')) {
  content = content.replace(
    '  const isNewStudent = React.useCallback((student: any): boolean => {',
    `${effectHook}\n  const isNewStudent = React.useCallback((student: any): boolean => {`
  );
}

// 5. Add "Voucher Audit Register" Mode button in Header Mode Switcher
const modeSwitcherTarget = `              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                  activeTab === "defaulters"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-rose-600 dark:text-rose-400 hover:text-rose-700"
                )}
              >
                Defaulters ({stats.defaulters})
              </button>`;

const newModeSwitcher = `              <button
                type="button"
                onClick={() => setActiveTab("defaulters")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1",
                  activeTab === "defaulters"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-rose-600 dark:text-rose-400 hover:text-rose-700"
                )}
              >
                Defaulters ({stats.defaulters})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("voucher-audit");
                  setAuditVouchersList(getIssuedVouchers());
                }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer",
                  activeTab === "voucher-audit"
                    ? "bg-teal-700 text-white shadow-xs"
                    : "text-teal-700 dark:text-teal-300 hover:text-teal-900"
                )}
              >
                <ShieldCheck size={13} />
                <span>Voucher Audit Register</span>
              </button>`;

if (!content.includes('Voucher Audit Register</span>') && content.includes(modeSwitcherTarget)) {
  content = content.replace(modeSwitcherTarget, newModeSwitcher);
}

// 6. Replace row "Collect" button to invoke Voucher-Verified modal
const oldCollectBtn = `                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStudent(student);
                                    setIsPaymentOpen(true);
                                  }}
                                  size="sm"
                                  className="h-8 px-3 rounded-lg bg-superior-teal hover:bg-superior-teal/90 text-white font-bold uppercase tracking-widest text-[10px] shadow-xs transition-all hover:scale-105 active:scale-95"
                                >
                                  Collect
                                </Button>`;

const newCollectBtn = `                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVoucherCollectStudent(student);
                                    setIsVoucherCollectOpen(true);
                                  }}
                                  size="sm"
                                  className="h-8 px-3 rounded-lg bg-superior-teal hover:bg-superior-teal/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
                                >
                                  <ShieldCheck size={11} />
                                  <span>Collect</span>
                                </Button>`;

if (content.includes(oldCollectBtn)) {
  content = content.replace(oldCollectBtn, newCollectBtn);
}

// 7. Add Voucher Audit Register View in Main Content Area when activeTab === "voucher-audit"
const mainTableStart = `      {/* Main Content Area: Table */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">`;

const voucherAuditViewJsx = `      {/* Main Content Area: Voucher Audit Register or Main Student Table */}
      {activeTab === "voucher-audit" ? (
        <div className="space-y-4">
          {/* Header & Filter Controls Bar */}
          <Card className="rounded-2xl border-teal-200 dark:border-teal-900 bg-gradient-to-br from-white via-teal-50/30 to-teal-100/20 dark:from-slate-900 dark:to-teal-950/30 shadow-xs overflow-hidden">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Official Fee Voucher Issuance & Collection Audit Register
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Audit tracking for every generated voucher, cash/bank receipt status, and recovery rates.
                    </p>
                  </div>
                </div>

                {/* PDF Download Button */}
                <Button
                  onClick={() => {
                    const vouchersToPrint = auditVouchersList.filter(v => {
                      if (auditMonthFilter !== "All Months" && v.feeMonth !== auditMonthFilter) return false;
                      if (auditStatusFilter === "pending" && v.status === "COLLECTED") return false;
                      if (auditStatusFilter === "collected" && v.status !== "COLLECTED") return false;
                      return true;
                    });
                    generateVoucherAuditPdf({
                      vouchers: vouchersToPrint,
                      filterMonth: auditMonthFilter,
                      reportTitle: "Daily / Monthly Voucher Issuance & Collection Audit Report",
                    });
                    toast.success("Voucher Audit Report PDF generated and downloaded!");
                  }}
                  className="bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs rounded-xl h-10 px-4 shadow-md flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <Download size={15} />
                  <span>Download Voucher Audit PDF</span>
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                  <Input
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search voucher #, student name, roll..."
                    className="pl-8 text-xs font-medium rounded-xl h-9 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Month Selector */}
                <Select value={auditMonthFilter} onValueChange={setAuditMonthFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Billing Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Months">All Billing Months</SelectItem>
                    <SelectItem value="November 2026">November 2026</SelectItem>
                    <SelectItem value="December 2026">December 2026</SelectItem>
                    <SelectItem value="January 2027">January 2027</SelectItem>
                    <SelectItem value="Admission / 1st Installment">Admission / 1st Installment</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Selector */}
                <Select value={auditStatusFilter} onValueChange={setAuditStatusFilter}>
                  <SelectTrigger className="h-9 rounded-xl text-xs font-bold bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Audit Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Audit Statuses</SelectItem>
                    <SelectItem value="pending">Pending Recovery (Unpaid)</SelectItem>
                    <SelectItem value="collected">Verified Collected (Paid)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audit Metrics Row */}
          {(() => {
            const list = auditVouchersList.filter(v => {
              if (auditMonthFilter !== "All Months" && v.feeMonth !== auditMonthFilter) return false;
              if (auditStatusFilter === "pending" && v.status === "COLLECTED") return false;
              if (auditStatusFilter === "collected" && v.status !== "COLLECTED") return false;
              if (auditSearchQuery.trim()) {
                const q = auditSearchQuery.toLowerCase();
                const name = (v.studentName || "").toLowerCase();
                const roll = (v.collegeNo || "").toLowerCase();
                const vch = (v.id || "").toLowerCase();
                return name.includes(q) || roll.includes(q) || vch.includes(q);
              }
              return true;
            });

            const totalCount = list.length;
            const collected = list.filter(v => v.status === "COLLECTED");
            const totalBilled = list.reduce((acc, v) => acc + (v.amountBilled || 0), 0);
            const totalCollected = collected.reduce((acc, v) => acc + (v.collectedAmount || v.amountBilled || 0), 0);
            const totalPending = list.reduce((acc, v) => v.status === "COLLECTED" ? acc : acc + (v.amountBilled || 0), 0);
            const rate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Vouchers in Scope</span>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
                    <span className="text-[10px] text-slate-400 font-medium">Official Registry Count</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">Total Billed Demand</span>
                    <p className="text-xl font-black text-teal-900 dark:text-teal-200 mt-1">Rs. {totalBilled.toLocaleString()}</p>
                    <span className="text-[10px] text-teal-600 font-medium">Billed to Students</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Verified Collected</span>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">Rs. {totalCollected.toLocaleString()}</p>
                    <span className="text-[10px] text-emerald-600 font-bold">{collected.length} Vouchers Cleared</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 shadow-2xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 dark:text-rose-400">Pending Arrears ({rate}%)</span>
                    <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">Rs. {totalPending.toLocaleString()}</p>
                    <span className="text-[10px] text-rose-600 font-bold">{totalCount - collected.length} Pending Handover</span>
                  </div>
                </div>

                {/* Vouchers Table */}
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hide-scrollbar">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                          <TableRow>
                            <TableHead className="font-black text-[10px] uppercase pl-6 h-11">Voucher Ref #</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11">Student Particulars</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11">Class / Section</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11">Month</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11 text-right">Billed Amount</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11 text-center">Audit Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-11 text-right">Collected</TableHead>
                            <TableHead className="font-black text-[10px] uppercase text-right pr-6 h-11">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="h-48 text-center text-slate-400">
                                <AlertCircle size={36} className="mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-wider">No Vouchers Match Current Filter</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            list.map((vch) => {
                              const matchingStudent = students?.find(st => st.id === vch.studentId || String(st.collegeNo) === String(vch.collegeNo));
                              const isCollected = vch.status === "COLLECTED";

                              return (
                                <TableRow key={vch.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-200/90 dark:border-slate-800">
                                  <TableCell className="pl-6 py-3 font-mono font-bold text-xs text-teal-800 dark:text-teal-300">
                                    <div className="flex items-center gap-1.5">
                                      <ShieldCheck size={13} className={isCollected ? "text-emerald-600" : "text-amber-500"} />
                                      <span>{vch.id}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-3">
                                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{vch.studentName}</div>
                                    <div className="text-[10px] text-slate-500 font-mono">Roll: {vch.collegeNo} • S/D/O {vch.fatherName}</div>
                                  </TableCell>
                                  <TableCell className="py-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    <div>{vch.section}</div>
                                    <div className="text-[10px] text-slate-500">{vch.campus}</div>
                                  </TableCell>
                                  <TableCell className="py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {vch.feeMonth}
                                  </TableCell>
                                  <TableCell className="py-3 text-right font-black text-xs text-slate-900 dark:text-white">
                                    Rs. {(vch.amountBilled || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="py-3 text-center">
                                    <span className={\`text-[10px] font-black px-2 py-0.5 rounded-full border \${
                                      isCollected
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                                    }\`}>
                                      {isCollected ? "COLLECTED" : "PENDING"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-3 text-right text-xs">
                                    {isCollected ? (
                                      <div>
                                        <div className="font-black text-emerald-600">Rs. {(vch.collectedAmount || vch.amountBilled).toLocaleString()}</div>
                                        <div className="text-[9.5px] text-slate-400 font-mono">{vch.collectedDate || vch.issueDate}</div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 font-mono text-[11px]">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 py-3">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {!isCollected && matchingStudent && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setVoucherCollectStudent(matchingStudent);
                                            setIsVoucherCollectOpen(true);
                                          }}
                                          className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer"
                                        >
                                          Collect
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          if (matchingStudent) {
                                            setChallanStudents([matchingStudent]);
                                            setIsChallanModalOpen(true);
                                          }
                                        }}
                                        className="h-7 px-2 rounded-lg text-slate-700 text-[10px] font-bold cursor-pointer"
                                      >
                                        Voucher
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      ) : (
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">`;

if (!content.includes('Official Fee Voucher Issuance & Collection Audit Register') && content.includes(mainTableStart)) {
  content = content.replace(mainTableStart, voucherAuditViewJsx);
  // Also close the conditional after the table's </Card>
  content = content.replace(
    `            </div>
          </CardContent>
        </Card>`,
    `            </div>
          </CardContent>
        </Card>
      )}`
  );
}

// 8. Render VoucherCollectPaymentModal at the bottom of FeeManagementView
const bottomDialogTarget = `{/* Challan Modal */}`;
const collectModalMount = `{/* Audit-Verified Fee Collection Modal */}
      {isVoucherCollectOpen && voucherCollectStudent && (
        <VoucherCollectPaymentModal
          isOpen={isVoucherCollectOpen}
          onClose={() => {
            setIsVoucherCollectOpen(false);
            setVoucherCollectStudent(null);
            setAuditVouchersList(getIssuedVouchers());
          }}
          student={voucherCollectStudent}
          data={data}
        />
      )}

      {/* Challan Modal */}`;

if (!content.includes('isVoucherCollectOpen && voucherCollectStudent &&') && content.includes(bottomDialogTarget)) {
  content = content.replace(bottomDialogTarget, collectModalMount);
}

fs.writeFileSync('src/components/FeeManagementView.tsx', content, 'utf8');
console.log('Successfully updated FeeManagementView.tsx!');
