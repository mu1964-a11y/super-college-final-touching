const fs = require('fs');

let content = fs.readFileSync('src/components/StudentDossier360.tsx', 'utf8');

// 1. Add activeStudent state and handler
if (!content.includes('const [activeStudent, setActiveStudent] = useState<any>(student);')) {
  content = content.replace(
    'const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);',
    `const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<any>(student);

  React.useEffect(() => {
    setActiveStudent(student);
  }, [student]);`
  );
}

// 2. Change curStudent definition to activeStudent
content = content.replace(
  'const totalPackage = Number(student.totalPackage || student.feeLedger?.totalPackage || 0);',
  `const curStudent = activeStudent || student;
  const totalPackage = Number(curStudent.totalPackage || curStudent.feeLedger?.totalPackage || 0);`
);
content = content.replace(/student\.feeReceived/g, 'curStudent.feeReceived');
content = content.replace(/student\.attendance/g, 'curStudent.attendance');

// 3. Update BS card calculations and add Remaining 2 Semesters Horizon
const oldBsCardCode = `              const curSem = student.currentSemester || student.feeLedger?.currentSemester || 6;
              const semFee = student.feeLedger?.semesterFee || 18000;
              const semPkg = curSem * semFee;
              const advanceSurplus = Math.max(0, totalReceived - semPkg);`;

const newBsCardCode = `              const curSem = curStudent.currentSemester || curStudent.feeLedger?.currentSemester || 6;
              const semFee = curStudent.feeLedger?.semesterFee || 18000;
              const semPkg = curSem * semFee;
              const advanceSurplus = Math.max(0, totalReceived - semPkg);

              // 4-Year BS Degree Horizon (8 Semesters Total)
              const totalDegreeSemesters = 8;
              const completedSemesters = Math.min(totalDegreeSemesters, curSem);
              const remainingSemesters = Math.max(0, totalDegreeSemesters - completedSemesters);
              const remainingSemestersFee = remainingSemesters * semFee;
              const totalDegreePackage = totalDegreeSemesters * semFee;
              const netDegreePayable = Math.max(0, totalDegreePackage - totalReceived);`;

if (content.includes(oldBsCardCode)) {
  content = content.replace(oldBsCardCode, newBsCardCode);
}

// 4. Update the BS Progression card JSX to include the Remaining 2 Semesters Notice
const oldMilestonesBlock = `                    {/* Semester Milestones Roadmap */}
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
                    </div>`;

const newMilestonesBlock = `                    {/* REMAINING 2 SEMESTERS DEGREE HORIZON BANNER */}
                    {remainingSemesters > 0 && (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                            <Clock size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-amber-200 text-xs">
                                Next Remaining Semesters: {remainingSemesters} Semesters Bakaya (Sem {curSem + 1} to Sem 8)
                              </span>
                              <span className="text-[9px] bg-amber-400/20 text-amber-300 font-black px-1.5 py-0.2 rounded border border-amber-400/30">
                                4-Year BS Degree
                              </span>
                            </div>
                            <p className="text-[10px] text-amber-200/80 mt-0.5">
                              Completed: {curSem} Semesters (Rs. {semPkg.toLocaleString()}) • Total 8-Sem Package: Rs. {totalDegreePackage.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 bg-black/25 px-3 py-1.5 rounded-lg border border-white/10">
                          <span className="text-[9px] uppercase font-bold text-amber-300/80 block">Upcoming Semesters Fees</span>
                          <span className="text-sm font-black text-amber-300">
                            Rs. {remainingSemestersFee.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono">
                            Net Degree Due: Rs. {netDegreePayable.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Semester Milestones Roadmap */}
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold uppercase text-slate-400">
                        <span>8-Semester Degree Progression:</span>
                        <span className="text-amber-300">{curSem} Completed • {remainingSemesters} Upcoming</span>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 text-[9px] font-bold text-center">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sNum => {
                          const isDone = sNum <= curSem;
                          return (
                            <div
                              key={sNum}
                              className={\`py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center \${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                                  : 'bg-amber-500/10 text-amber-300/90 border-amber-500/30'
                              }\`}
                            >
                              <span>Sem {sNum}</span>
                              <span className="text-[8px] opacity-80">{isDone ? '✓ Paid' : 'Due Rs. 18k'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>`;

if (content.includes(oldMilestonesBlock)) {
  content = content.replace(oldMilestonesBlock, newMilestonesBlock);
}

// 5. Replace single long Table with Divided 2-Part (Aamne Saamne) Side-by-Side Tables
const oldTableBlock = `                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/80">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Receipt / Month</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Amount Paid</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Date & Time</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeTransactions.length > 0 ? (
                          feeTransactions.map((tx: any, idx: number) => (
                            <TableRow key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                {tx.description || tx.month || \`Voucher #\${tx.receiptId || idx + 1}\`}
                              </TableCell>
                              <TableCell className="text-right font-black text-emerald-600 text-xs">
                                Rs. {(tx.amount || 0).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-slate-500">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {formatLedgerDate(tx.date)}
                                </div>
                                {(() => {
                                  let timeDisplay = '';
                                  if (tx.createdAt || tx.created_at) {
                                    const d = new Date(tx.createdAt || tx.created_at);
                                    if (!isNaN(d.getTime())) timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  } else if (typeof tx.date === 'string' && (tx.date.includes('T') || tx.date.includes(':'))) {
                                    const d = new Date(tx.date);
                                    if (!isNaN(d.getTime())) timeDisplay = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                  } else if (typeof tx.id === 'string' && tx.id.startsWith('tx-')) {
                                    const ts = Number(tx.id.replace('tx-', '').split('-')[0]);
                                    if (!isNaN(ts) && ts > 1600000000000 && ts < 2500000000000) {
                                      timeDisplay = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                                    }
                                  }
                                  return timeDisplay ? (
                                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1 mt-0.5">
                                      <Clock size={10} />
                                      {timeDisplay}
                                    </div>
                                  ) : null;
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[9px] font-bold uppercase",
                                    (tx.paymentMethod === 'WhatsApp Bot' || (tx.recordedBy || tx.collectedBy || '').toLowerCase().includes('whatsapp'))
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-black shadow-2xs"
                                      : ""
                                  )}
                                >
                                  {(tx.paymentMethod === 'WhatsApp Bot' || (tx.recordedBy || tx.collectedBy || '').toLowerCase().includes('whatsapp'))
                                    ? \`🤖 Via WhatsApp Bot \${((tx.recordedBy || tx.collectedBy || '').replace(/whatsapp bot/i, '').replace(/[()]/g, '').trim()) ? \`(\${((tx.recordedBy || tx.collectedBy || '').replace(/whatsapp bot/i, '').replace(/[()]/g, '').trim())})\` : ''}\`
                                    : (tx.paymentMethod || 'Cash Payment')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="h-40 text-center text-slate-400">
                              <DollarSign size={32} className="mx-auto mb-2 opacity-30 text-teal-600" />
                              <p className="text-xs font-bold uppercase tracking-wider">No Transaction Records Found</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Payments made will automatically reflect in this real-time ledger.</p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>`;

const newTableBlock = `                  {/* 2-PART DIVIDED SIDE-BY-SIDE INSTALLMENTS (AAMNE SAAMNE) */}
                  {(() => {
                    if (feeTransactions.length === 0) {
                      return (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 bg-white dark:bg-slate-900 shadow-sm">
                          <DollarSign size={32} className="mx-auto mb-2 opacity-30 text-teal-600" />
                          <p className="text-xs font-bold uppercase tracking-wider">No Transaction Records Found</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Payments made will automatically reflect in this real-time ledger.</p>
                        </div>
                      );
                    }

                    // Sort chronologically by installment number
                    const sorted = [...feeTransactions].sort((a: any, b: any) => {
                      const numA = parseInt((a.description || '').match(/#(\\d+)/)?.[1] || '0', 10);
                      const numB = parseInt((b.description || '').match(/#(\\d+)/)?.[1] || '0', 10);
                      if (numA && numB) return numA - numB;
                      return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
                    });

                    // If more than 4 transactions, divide into 2 columns side-by-side
                    const shouldSplit = sorted.length > 4;
                    const half = shouldSplit ? Math.ceil(sorted.length / 2) : sorted.length;
                    const part1 = sorted.slice(0, half);
                    const part2 = shouldSplit ? sorted.slice(half) : [];

                    const sumPart1 = part1.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
                    const sumPart2 = part2.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

                    const renderPartTable = (items: any[], title: string, subtotal: number, badgeText: string) => (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col">
                        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 dark:text-slate-100">{title}</span>
                            <span className="text-[9.5px] bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full">
                              {badgeText}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9.5px] uppercase font-bold text-slate-400 mr-1">Part Sum:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">Rs. {subtotal.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="overflow-x-auto hide-scrollbar">
                          <Table>
                            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/40">
                              <TableRow className="border-b border-slate-200 dark:border-slate-800">
                                <TableHead className="text-[9.5px] font-black uppercase py-2 pl-3">Installment / Receipt</TableHead>
                                <TableHead className="text-[9.5px] font-black uppercase text-right py-2">Paid</TableHead>
                                <TableHead className="text-[9.5px] font-black uppercase py-2 pr-3 text-right">Date & Mode</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((tx: any, idx: number) => (
                                <TableRow key={tx.id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60">
                                  <TableCell className="font-bold text-[11px] text-slate-800 dark:text-slate-200 py-2 pl-3">
                                    <div className="leading-tight">{tx.description || tx.month || \`Installment #\${idx + 1}\`}</div>
                                    {tx.receiptId && (
                                      <span className="font-mono text-[9px] text-slate-400">Rec: {tx.receiptId}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-black text-emerald-600 text-xs py-2 whitespace-nowrap">
                                    Rs. {(tx.amount || 0).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="text-right text-[10px] font-mono text-slate-500 py-2 pr-3 whitespace-nowrap">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                                      {formatLedgerDate(tx.date)}
                                    </div>
                                    <span className="text-[9px] text-slate-400">{tx.paymentMethod || 'Cash'}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );

                    return (
                      <div className={shouldSplit ? "grid grid-cols-1 lg:grid-cols-2 gap-3.5" : "w-full"}>
                        {renderPartTable(part1, shouldSplit ? "Part 1 • Initial Installments" : "All Fee Installments", sumPart1, \`\${part1.length} Receipts\`)}
                        {shouldSplit && renderPartTable(part2, "Part 2 • Advanced Installments", sumPart2, \`\${part2.length} Receipts\`)}
                      </div>
                    );
                  })()}`;

if (content.includes(oldTableBlock)) {
  content = content.replace(oldTableBlock, newTableBlock);
}

// 6. Update VoucherCollectPaymentModal invocation with onPaymentSuccess handler
const oldModalMount = `      {/* Audit-Verified Fee Collection Modal */}
      {isCollectPaymentOpen && (
        <VoucherCollectPaymentModal
          isOpen={isCollectPaymentOpen}
          onClose={() => setIsCollectPaymentOpen(false)}
          student={student}
          data={data}
        />
      )}`;

const newModalMount = `      {/* Audit-Verified Fee Collection Modal */}
      {isCollectPaymentOpen && (
        <VoucherCollectPaymentModal
          isOpen={isCollectPaymentOpen}
          onClose={() => setIsCollectPaymentOpen(false)}
          student={curStudent}
          data={data}
          onPaymentSuccess={(paymentRecord) => {
            const newRec = (curStudent.feeReceived || 0) + paymentRecord.amountPaid;
            const newTx = {
              id: \`tx-\${Date.now()}\`,
              date: paymentRecord.datePaid,
              amount: paymentRecord.amountPaid,
              receiptId: paymentRecord.receiptNo,
              description: \`Fee Collection (\${paymentRecord.voucherNo})\`,
              paymentMethod: 'Cash',
              recordedBy: 'Accounts Counter'
            };
            const updated = {
              ...curStudent,
              feeReceived: newRec,
              feeLedger: {
                ...(curStudent.feeLedger || {}),
                totalReceived: newRec,
                remainingBalance: Math.max(0, (curStudent.totalPackage || 0) - newRec),
                transactions: [newTx, ...(curStudent.feeLedger?.transactions || [])]
              }
            };
            setActiveStudent(updated);
            setIsCollectPaymentOpen(false);
            toast.success(\`Fee Rs. \${paymentRecord.amountPaid.toLocaleString()} collected! Dossier ledger updated.\`);
          }}
        />
      )}`;

if (content.includes(oldModalMount)) {
  content = content.replace(oldModalMount, newModalMount);
}

fs.writeFileSync('src/components/StudentDossier360.tsx', content, 'utf8');
console.log('Successfully applied all dossier fixes to StudentDossier360.tsx!');
