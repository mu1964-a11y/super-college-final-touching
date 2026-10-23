import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface GeneratedWhatsAppPdf {
  pdfBuffer: Buffer;
  fileName: string;
  caption: string;
}

const COLLEGE_TITLE = "SUPERIOR COLLEGE JAHANIAN";
const COLLEGE_SUBTITLE = "Official ERP & Automated Document Verification System • Canal Road, Jahanian";

function getPktNowInfo(customDate?: string | Date): {
  dateFormatted: string;
  dayName: string;
  timeFormatted: string;
  isoDate: string;
  monthLabel: string;
  docRef: string;
} {
  const base = customDate ? new Date(customDate) : new Date();
  const validDate = isNaN(base.getTime()) ? new Date() : base;
  const pkt = new Date(validDate.getTime() + (5 * 60 + validDate.getTimezoneOffset()) * 60 * 1000);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayName = days[pkt.getDay()];
  const dd = String(pkt.getDate()).padStart(2, "0");
  const mmm = months[pkt.getMonth()];
  const yyyy = pkt.getFullYear();
  const dateFormatted = `${dd} ${mmm} ${yyyy}`;
  const isoDate = `${yyyy}-${String(pkt.getMonth() + 1).padStart(2, "0")}-${dd}`;
  const monthLabel = `${fullMonths[pkt.getMonth()]} ${yyyy}`;

  let hours = pkt.getHours();
  const mins = String(pkt.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const timeFormatted = `${String(hours).padStart(2, "0")}:${mins} ${ampm}`;

  const docRef = `SCJ-${yyyy}${String(pkt.getMonth() + 1).padStart(2, "0")}${dd}-${Math.floor(1000 + Math.random() * 9000)}`;

  return { dateFormatted, dayName, timeFormatted, isoDate, monthLabel, docRef };
}

function formatDateDayTime(rawDate?: string | null, fallbackTime?: string): {
  dateStr: string;
  dayStr: string;
  timeStr: string;
} {
  if (!rawDate) {
    const now = getPktNowInfo();
    return { dateStr: now.dateFormatted, dayStr: now.dayName, timeStr: fallbackTime || now.timeFormatted };
  }
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dateStr = `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${d.getFullYear()}`;
      const dayStr = days[d.getDay()];
      let timeStr = fallbackTime || "";
      if (!timeStr && rawDate.includes("T")) {
        let h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        timeStr = `${String(h).padStart(2, "0")}:${m} ${ampm}`;
      }
      if (!timeStr) timeStr = "Official Hours";
      return { dateStr, dayStr, timeStr };
    }
  } catch {}
  return { dateStr: String(rawDate), dayStr: "-", timeStr: fallbackTime || "Official Hours" };
}

function drawExecutiveHeader(
  doc: jsPDF,
  documentTitle: string,
  badgeText: string,
  metaInfo: { dateFormatted: string; dayName: string; timeFormatted: string; docRef: string }
): number {
  // Deep Royal Navy Header Banner
  doc.setFillColor(11, 36, 71); // #0B2447
  doc.rect(0, 0, 210, 36, "F");

  // Gold/Amber Accent Strip
  doc.setFillColor(217, 119, 6); // #D97706
  doc.rect(0, 36, 210, 2.2, "F");

  // College Name (Strictly "SUPERIOR COLLEGE JAHANIAN")
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(COLLEGE_TITLE, 14, 14);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(COLLEGE_SUBTITLE, 14, 20);

  // Document Title Banner Pill
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(253, 224, 71); // Warm gold
  doc.text(documentTitle.toUpperCase(), 14, 29.5);

  // Right-side Metadata Block (Ref, Date, Day, Time)
  doc.setFillColor(22, 53, 99);
  doc.roundedRect(138, 6, 58, 25, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(253, 224, 71);
  doc.text(badgeText.toUpperCase(), 167, 11.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(241, 245, 249);
  doc.text(`Ref: ${metaInfo.docRef}`, 142, 17);
  doc.text(`Date: ${metaInfo.dateFormatted} (${metaInfo.dayName.slice(0, 3)})`, 142, 22);
  doc.text(`Time: ${metaInfo.timeFormatted}`, 142, 27);

  return 44;
}

function drawIdentityCard(
  doc: jsPDF,
  startY: number,
  sectionTitle: string,
  fields: Array<{ label: string; value: string }>
): number {
  const rows = Math.ceil(fields.length / 2);
  const boxHeight = 10 + rows * 7.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, startY, 182, boxHeight, 2, 2, "FD");

  // Section Header Strip
  doc.setFillColor(6, 78, 67); // Superior Teal #064E43
  doc.roundedRect(14, startY, 182, 7.5, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(sectionTitle.toUpperCase(), 18, startY + 5.2);

  let currentY = startY + 13.5;
  for (let i = 0; i < fields.length; i += 2) {
    const left = fields[i];
    const right = fields[i + 1];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${left.label}:`, 18, currentY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(String(left.value || "N/A").slice(0, 34), 52, currentY);

    if (right) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`${right.label}:`, 110, currentY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(String(right.value || "N/A").slice(0, 34), 144, currentY);
    }
    currentY += 7.2;
  }

  return startY + boxHeight + 6;
}

function drawSummaryKPIBoxes(
  doc: jsPDF,
  startY: number,
  boxes: Array<{ label: string; value: string; subtext?: string; highlight?: "navy" | "teal" | "crimson" | "amber" }>
): number {
  const count = boxes.length;
  const gap = 4;
  const totalWidth = 182;
  const boxWidth = (totalWidth - gap * (count - 1)) / count;
  const boxHeight = 19;

  boxes.forEach((b, idx) => {
    const x = 14 + idx * (boxWidth + gap);
    let bg: [number, number, number] = [241, 245, 249];
    let border: [number, number, number] = [148, 163, 184];
    let titleColor: [number, number, number] = [71, 85, 105];
    let valColor: [number, number, number] = [15, 23, 42];

    if (b.highlight === "navy") {
      bg = [239, 246, 255];
      border = [30, 64, 175];
      titleColor = [30, 64, 175];
      valColor = [11, 36, 71];
    } else if (b.highlight === "teal") {
      bg = [236, 253, 245];
      border = [5, 150, 105];
      titleColor = [6, 95, 70];
      valColor = [6, 78, 59];
    } else if (b.highlight === "crimson") {
      bg = [254, 242, 242];
      border = [220, 38, 38];
      titleColor = [153, 27, 27];
      valColor = [185, 28, 28];
    } else if (b.highlight === "amber") {
      bg = [255, 251, 235];
      border = [217, 119, 6];
      titleColor = [146, 64, 14];
      valColor = [180, 83, 9];
    }

    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.setDrawColor(border[0], border[1], border[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, startY, boxWidth, boxHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    doc.text(b.label.toUpperCase(), x + boxWidth / 2, startY + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(valColor[0], valColor[1], valColor[2]);
    doc.text(b.value, x + boxWidth / 2, startY + 13, { align: "center" });

    if (b.subtext) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139);
      doc.text(b.subtext, x + boxWidth / 2, startY + 17.2, { align: "center" });
    }
  });

  return startY + boxHeight + 6;
}

function drawExecutiveFooter(doc: jsPDF, metaInfo: { dateFormatted: string; dayName: string; timeFormatted: string; docRef: string }) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 18;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(11, 36, 71);
  doc.text(`${COLLEGE_TITLE} — DIGITAL VERIFIED STATEMENT`, 14, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated on ${metaInfo.dayName}, ${metaInfo.dateFormatted} at ${metaInfo.timeFormatted} PKT | Document ID: ${metaInfo.docRef}`,
    14,
    y + 9.5
  );
  doc.text("This is a computer-generated official record and does not require a physical signature.", 14, y + 13.5);
}

function toSafeFilename(str: string): string {
  return String(str || "Record")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "Record";
}

// ============================================================================
// 1. OFFICIAL ADMISSION CONFIRMATION SLIP PDF
// ============================================================================
export function generateAdmissionSlipPdf(admission: any): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo(admission?.date || admission?.created_at);

  const studentName = admission?.fullName || admission?.full_name || "Student";
  const fatherName = admission?.fatherName || admission?.father_name || "N/A";
  const rollNo = admission?.collegeNo || admission?.college_no || admission?.studentId || admission?.student_id || admission?.id || "SCJ-2026";
  const program = admission?.groupName || admission?.group_name || admission?.group || admission?.course || admission?.category || "Intermediate";
  const section = admission?.section || "A";
  const session = admission?.session || "2026-28";
  const campus = admission?.category || (admission?.gender === "Female" ? "Girls Campus" : "Boys Campus");
  const contact = admission?.contact || admission?.contact_number || admission?.fatherContact || admission?.father_contact || "N/A";
  const bForm = admission?.bayFormNo || admission?.bay_form_no || admission?.cnic || "N/A";
  const prevMarks = admission?.previousMarks || admission?.previous_marks ? `${admission.previousMarks || admission.previous_marks} Marks` : "Verified";

  const totalPkg = Number(admission?.totalPackage || admission?.total_package || admission?.total_fee_finalized || 0);
  const feePaid = Number(admission?.feeReceived || admission?.fee_received || admission?.admissionFee || admission?.admission_fee || 0);
  const remaining = Math.max(0, totalPkg - feePaid);

  let y = drawExecutiveHeader(doc, "Official Admission Confirmation Slip", "ADMISSION CONFIRMED", nowInfo);

  y = drawIdentityCard(doc, y, "Verified Student & Enrolment Particulars", [
    { label: "Student Name", value: studentName },
    { label: "Father Name", value: fatherName },
    { label: "Roll / College ID", value: String(rollNo) },
    { label: "Academic Session", value: session },
    { label: "Program / Class", value: `${program} (Sec ${section})` },
    { label: "Campus Wing", value: campus },
    { label: "CNIC / B-Form", value: String(bForm) },
    { label: "Registered Contact", value: String(contact) },
    { label: "Previous Record", value: prevMarks },
    { label: "Admission Date", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    { label: "Total Agreed Package", value: `Rs. ${totalPkg.toLocaleString()}`, subtext: `Session ${session}`, highlight: "navy" },
    { label: "Admission Fee Paid", value: `Rs. ${feePaid.toLocaleString()}`, subtext: `${nowInfo.dateFormatted} • ${nowInfo.timeFormatted}`, highlight: "teal" },
    { label: "Remaining Balance", value: `Rs. ${remaining.toLocaleString()}`, subtext: remaining > 0 ? "Payable in Installments" : "Fully Cleared", highlight: remaining > 0 ? "amber" : "teal" },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Session / Plan", "Date & Day", "Time", "Status", "Amount (PKR)"]],
    body: [
      [
        `Admission & Enrolment (${program})`,
        session,
        `${nowInfo.dateFormatted} (${nowInfo.dayName})`,
        nowInfo.timeFormatted,
        "Confirmed",
        `Rs. ${totalPkg.toLocaleString()}`,
      ],
      [
        "Initial Fee Deposit Received",
        admission?.paymentPlan || admission?.payment_plan || "Installment Plan",
        `${nowInfo.dateFormatted} (${nowInfo.dayName})`,
        nowInfo.timeFormatted,
        "Received",
        `Rs. ${feePaid.toLocaleString()}`,
      ],
      [
        "Net Remaining Fee Balance",
        "Upcoming Schedule",
        "-",
        "-",
        remaining > 0 ? "Pending" : "Cleared",
        `Rs. ${remaining.toLocaleString()}`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Admission_Slip_${toSafeFilename(rollNo)}_${toSafeFilename(studentName)}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
🎓 *OFFICIAL ADMISSION CONFIRMATION SLIP*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${studentName}* S/D/O *${fatherName}*
🆔 *Roll / ID:* *${rollNo}* | *Class:* *${program} (${section})*
📅 *Date & Time:* ${nowInfo.dayName}, ${nowInfo.dateFormatted} • ${nowInfo.timeFormatted}
💳 *Package:* Rs. ${totalPkg.toLocaleString()} | *Paid:* Rs. ${feePaid.toLocaleString()} | *Balance:* *Rs. ${remaining.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━
📎 _Aap ki Official Admission Confirmation PDF Slip niche attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 2. COMBINED FEE RECEIPT & COMPLETE HISTORICAL LEDGER STATEMENT PDF
// ============================================================================
export function generateFeeReceiptAndStatementPdf(
  student: any,
  currentPayment?: {
    receiptId?: string;
    amountPaid?: number;
    datePaid?: string;
    feeType?: string;
    paymentMethod?: string;
    collectedBy?: string;
  } | null,
  rawHistory?: any[]
): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo(currentPayment?.datePaid);

  const studentName = student?.fullName || student?.full_name || "Student";
  const fatherName = student?.fatherName || student?.father_name || "N/A";
  const rollNo = student?.collegeNo || student?.college_no || student?.studentId || student?.id || "N/A";
  const program = student?.group || student?.groupName || student?.currentClass || student?.category || "Intermediate";
  const section = student?.section || "A";
  const session = student?.session || "2026-28";
  const contact = student?.fatherContact || student?.father_contact || student?.contact || student?.contact_number || "Verified";

  const totalPkg = Number(student?.totalPackage || student?.total_package || student?.total_fee_finalized || 0);
  const historyList: any[] = Array.isArray(rawHistory)
    ? rawHistory
    : Array.isArray(student?.fee_history)
    ? student.fee_history
    : Array.isArray(student?.feeHistory)
    ? student.feeHistory
    : [];

  // Normalize all historical payments in chronological order
  const normalizedRows: Array<{
    receiptId: string;
    dateStr: string;
    dayStr: string;
    timeStr: string;
    feeType: string;
    mode: string;
    amount: number;
  }> = [];

  historyList.forEach((h: any, idx: number) => {
    const amt = Number(h?.amountPaid || h?.amount || 0);
    if (amt <= 0) return;
    const dt = formatDateDayTime(h?.datePaid || h?.date || h?.created_at, h?.timePaid || h?.time);
    normalizedRows.push({
      receiptId: String(h?.receiptId || h?.id || `REC-${idx + 1}`),
      dateStr: dt.dateStr,
      dayStr: dt.dayStr,
      timeStr: dt.timeStr,
      feeType: String(h?.feeType || h?.fee_type || h?.month || "Tuition Fee Installment"),
      mode: String(h?.paymentMethod || h?.payment_method || "Cash Counter"),
      amount: amt,
    });
  });

  // If currentPayment was just made and isn't already in normalizedRows, append it
  if (currentPayment && Number(currentPayment.amountPaid || 0) > 0) {
    const alreadyExists = normalizedRows.some(
      (r) => currentPayment.receiptId && r.receiptId === currentPayment.receiptId
    );
    if (!alreadyExists) {
      const dt = formatDateDayTime(currentPayment.datePaid);
      normalizedRows.push({
        receiptId: currentPayment.receiptId || nowInfo.docRef,
        dateStr: dt.dateStr,
        dayStr: dt.dayStr,
        timeStr: dt.timeStr,
        feeType: currentPayment.feeType || "Tuition Fee Installment",
        mode: currentPayment.paymentMethod || "Cash / Counter",
        amount: Number(currentPayment.amountPaid),
      });
    }
  }

  const historySum = normalizedRows.reduce((acc, r) => acc + r.amount, 0);
  const totalPaid = Math.max(Number(student?.feeReceived || student?.fee_received || 0), historySum);

  // If DB had fee_received > 0 but no itemized rows in fee_history array, include the initial deposit row
  if (normalizedRows.length === 0 && totalPaid > 0) {
    const dt = formatDateDayTime(student?.date || student?.created_at);
    normalizedRows.push({
      receiptId: `ADM-${String(rollNo).slice(-4)}`,
      dateStr: dt.dateStr,
      dayStr: dt.dayStr,
      timeStr: dt.timeStr,
      feeType: "Admission & Previous Installments",
      mode: "Verified Ledger",
      amount: totalPaid,
    });
  } else if (totalPaid > historySum && historySum > 0) {
    const priorDiff = totalPaid - historySum;
    normalizedRows.unshift({
      receiptId: `PRV-${String(rollNo).slice(-4)}`,
      dateStr: "Prior Dates",
      dayStr: "Verified",
      timeStr: "Official Hours",
      feeType: "Previous Submitted Installments",
      mode: "Accounts Ledger",
      amount: priorDiff,
    });
  }

  const remaining = Math.max(0, totalPkg - totalPaid);
  const latestPayment = currentPayment && Number(currentPayment.amountPaid || 0) > 0
    ? Number(currentPayment.amountPaid)
    : normalizedRows.length > 0
    ? normalizedRows[normalizedRows.length - 1].amount
    : 0;

  let y = drawExecutiveHeader(
    doc,
    currentPayment ? "Official Fee Receipt & Complete Account Statement" : "Official Student Fee Ledger & Payment Statement",
    remaining === 0 ? "ALL DUES CLEARED" : "OFFICIAL STATEMENT",
    nowInfo
  );

  y = drawIdentityCard(doc, y, "Verified Student Account Information", [
    { label: "Student Name", value: studentName },
    { label: "Father Name", value: fatherName },
    { label: "Roll / College ID", value: String(rollNo) },
    { label: "Class & Section", value: `${program} (Sec ${section})` },
    { label: "Academic Session", value: session },
    { label: "Verified Contact", value: String(contact) },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    { label: "Total Fee Package", value: `Rs. ${totalPkg.toLocaleString()}`, subtext: `Session ${session}`, highlight: "navy" },
    {
      label: currentPayment ? "Paid Now (Latest)" : "Last Installment",
      value: `Rs. ${latestPayment.toLocaleString()}`,
      subtext: `${nowInfo.dateFormatted} (${nowInfo.dayName.slice(0, 3)})`,
      highlight: "teal",
    },
    { label: "Total Submitted", value: `Rs. ${totalPaid.toLocaleString()}`, subtext: `${normalizedRows.length} Installment(s)`, highlight: "teal" },
    {
      label: "Remaining Balance",
      value: `Rs. ${remaining.toLocaleString()}`,
      subtext: remaining === 0 ? "100% Cleared" : "Pending Payable",
      highlight: remaining === 0 ? "teal" : "crimson",
    },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(11, 36, 71);
  doc.text("CHRONOLOGICAL FEE INSTALLMENTS & PAYMENT HISTORY (DATE, DAY & TIME WISE)", 14, y + 3);

  const tableBody =
    normalizedRows.length > 0
      ? normalizedRows.map((r, i) => [
          String(i + 1),
          r.receiptId,
          r.dateStr,
          r.dayStr,
          r.timeStr,
          r.feeType,
          r.mode,
          `Rs. ${r.amount.toLocaleString()}`,
        ])
      : [["1", "-", nowInfo.dateFormatted, nowInfo.dayName, nowInfo.timeFormatted, "No installment recorded yet", "-", "Rs. 0"]];

  // Append Summary Footer Row inside Table
  tableBody.push([
    "",
    "TOTAL",
    `Up to ${nowInfo.dateFormatted}`,
    nowInfo.dayName,
    nowInfo.timeFormatted,
    `Total Paid: Rs. ${totalPaid.toLocaleString()}`,
    `Remaining: Rs. ${remaining.toLocaleString()}`,
    `Rs. ${totalPaid.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: y + 6,
    head: [["Sr#", "Receipt No", "Date", "Day", "Time", "Description / Fee Head", "Mode", "Amount Paid"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [226, 232, 240];
        data.cell.styles.textColor = [11, 36, 71];
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Fee_Receipt_Statement_${toSafeFilename(rollNo)}_${toSafeFilename(studentName)}.pdf`;

  const caption = currentPayment
    ? `🏛️ *${COLLEGE_TITLE}*
🧾 *OFFICIAL FEE RECEIPT & ACCOUNT STATEMENT*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${studentName}* (Roll: *${rollNo}*)
💵 *Received Now:* *Rs. ${Number(currentPayment.amountPaid || 0).toLocaleString()}* (${nowInfo.dayName}, ${nowInfo.dateFormatted} • ${nowInfo.timeFormatted})
📊 *Total Submitted:* Rs. ${totalPaid.toLocaleString()} / Rs. ${totalPkg.toLocaleString()}
📌 *Remaining Balance:* *Rs. ${remaining.toLocaleString()}* ${remaining === 0 ? "✅" : "⚠️"}
━━━━━━━━━━━━━━━━━━━━
📎 _Aaj ki Receipt aur pichle tamam maheenon/dinon ki mukammal Date & Time-wise Fee Statement PDF mein attach hai._`
    : `🏛️ *${COLLEGE_TITLE}*
📊 *OFFICIAL FEE LEDGER & PAYMENT STATEMENT*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${studentName}* S/D/O *${fatherName}* (Roll: *${rollNo}*)
💳 *Total Package:* Rs. ${totalPkg.toLocaleString()} | *Total Submitted:* *Rs. ${totalPaid.toLocaleString()}*
📌 *Remaining Balance:* *Rs. ${remaining.toLocaleString()}* ${remaining === 0 ? "✅ (Cleared)" : "⚠️ (Pending)"}
━━━━━━━━━━━━━━━━━━━━
📎 _Tamam jama shuda installments (Date, Day & Time ke sath) ki Official Statement PDF attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 3. CUMULATIVE DAY-BY-DAY STAFF ATTENDANCE & PUNCTUALITY PDF (DAILY + WEEKLY + MONTHLY)
// ============================================================================
export function generateCumulativeStaffAttendancePdf(
  staff: any,
  monthAttendanceRows: any[],
  targetDateStr?: string
): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo(targetDateStr);

  const staffName = staff?.fullName || staff?.full_name || staff?.name || "Faculty Member";
  const staffId = staff?.id || staff?.staffId || "STF-01";
  const role = staff?.designation || staff?.role || "Faculty";
  const phone = staff?.contact || staff?.phone || "Verified";

  const activeDateStr = targetDateStr || nowInfo.isoDate;
  const [yr, mo, dy] = activeDateStr.split("-").map(Number);
  const year = yr || new Date().getFullYear();
  const month = mo || new Date().getMonth() + 1;
  const maxDay = dy || new Date().getDate();

  const daysNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const recordMap = new Map<string, any>();
  for (const r of monthAttendanceRows || []) {
    const dKey = String(r.date || "").slice(0, 10);
    if (dKey) recordMap.set(dKey, r);
  }

  let monthlyPresent = 0;
  let monthlyLate = 0;
  let monthlyAbsent = 0;
  let monthlyLeave = 0;
  let monthlyWorkingDays = 0;

  let weeklyPresent = 0;
  let weeklyLate = 0;
  let weeklyAbsent = 0;
  let weeklyLeave = 0;

  const dayRows: string[][] = [];

  for (let d = 1; d <= maxDay; d++) {
    const dStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const jsDate = new Date(year, month - 1, d);
    const dayName = daysNames[jsDate.getDay()];
    const isSunday = jsDate.getDay() === 0;
    const isWithinLast7Days = maxDay - d < 7;

    const rec = recordMap.get(dStr);
    const rawStatus = rec?.status || (isSunday ? "Sunday Holiday" : "Not Marked");
    const checkIn = rec?.check_in_time || rec?.checkInTime || rec?.check_in || rec?.checkIn || (rawStatus === "Present" ? "08:00 AM" : "-");
    const checkOut = rec?.check_out_time || rec?.checkOutTime || rec?.check_out || rec?.checkOut || (rawStatus === "Present" || rawStatus === "Late" ? "02:00 PM" : "-");
    let cleanRemarks = rec?.notes || "-";
    if (typeof cleanRemarks === "string" && cleanRemarks.startsWith("{")) {
      cleanRemarks = "Biometric Verified";
    }

    if (!isSunday && rawStatus !== "College Holiday" && rawStatus !== "Public Holiday") {
      if (rec) monthlyWorkingDays++;
      if (rawStatus === "Present") {
        monthlyPresent++;
        if (isWithinLast7Days) weeklyPresent++;
      } else if (rawStatus === "Late") {
        monthlyLate++;
        if (isWithinLast7Days) weeklyLate++;
      } else if (rawStatus === "Absent") {
        monthlyAbsent++;
        if (isWithinLast7Days) weeklyAbsent++;
      } else if (rawStatus.includes("Leave") || rawStatus === "Half Day") {
        monthlyLeave++;
        if (isWithinLast7Days) weeklyLeave++;
      }
    }

    dayRows.push([
      `${String(d).padStart(2, "0")} ${shortMonths[month - 1]} ${year}`,
      dayName,
      String(checkIn),
      String(checkOut),
      rawStatus.toUpperCase(),
      String(cleanRemarks).slice(0, 28),
    ]);
  }

  const todayRec = recordMap.get(activeDateStr);
  const todayStatus = todayRec?.status || "Present";
  const todayCheckIn = todayRec?.check_in_time || todayRec?.checkInTime || todayRec?.check_in || todayRec?.checkIn || nowInfo.timeFormatted;
  const attendancePct =
    monthlyWorkingDays > 0 ? Math.round(((monthlyPresent + monthlyLate) / monthlyWorkingDays) * 100) : 100;

  let y = drawExecutiveHeader(
    doc,
    `Cumulative Staff Attendance Register (${shortMonths[month - 1]} ${year})`,
    `TODAY: ${todayStatus.toUpperCase()}`,
    nowInfo
  );

  y = drawIdentityCard(doc, y, "Verified Faculty Profile & Daily Attendance Stamp", [
    { label: "Faculty Name", value: staffName },
    { label: "Staff ID", value: String(staffId) },
    { label: "Designation", value: String(role) },
    { label: "Registered Phone", value: String(phone) },
    { label: "Updated Up To", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
    { label: "Today's Check-In", value: `${todayStatus} • ${todayCheckIn}` },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    {
      label: "Today's Status",
      value: todayStatus.toUpperCase(),
      subtext: `${nowInfo.dayName} • ${todayCheckIn}`,
      highlight: todayStatus === "Absent" ? "crimson" : todayStatus === "Late" ? "amber" : "teal",
    },
    {
      label: "Weekly Summary (7d)",
      value: `P:${weeklyPresent} | L:${weeklyLate} | A:${weeklyAbsent}`,
      subtext: `Leaves: ${weeklyLeave} this week`,
      highlight: "navy",
    },
    {
      label: "Monthly Present / Late",
      value: `${monthlyPresent} Present / ${monthlyLate} Late`,
      subtext: `Out of ${monthlyWorkingDays} logged days`,
      highlight: "teal",
    },
    {
      label: "Monthly Absent / %",
      value: `${monthlyAbsent} Absent (${attendancePct}%)`,
      subtext: `Leaves: ${monthlyLeave}`,
      highlight: monthlyAbsent > 2 ? "crimson" : "navy",
    },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(11, 36, 71);
  doc.text(`DAY-BY-DAY RUNNING ATTENDANCE LOG (01 ${shortMonths[month - 1].toUpperCase()} TO ${String(maxDay).padStart(2, "0")} ${shortMonths[month - 1].toUpperCase()} ${year})`, 14, y + 2.5);

  autoTable(doc, {
    startY: y + 5,
    head: [["Date", "Day of Week", "Check-In Time", "Check-Out Time", "Attendance Status", "Remarks / Mode"]],
    body: dayRows,
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.8 },
    bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42], cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw || "");
        if (val.includes("ABSENT")) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("LATE")) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("PRESENT")) {
          data.cell.styles.textColor = [6, 95, 70];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Staff_Attendance_${toSafeFilename(staffName)}_${year}_${String(month).padStart(2, "0")}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
📋 *DAILY UPDATED STAFF ATTENDANCE REPORT*
━━━━━━━━━━━━━━━━━━━━
👤 *Faculty:* *${staffName}* (*${role}* • ID: *${staffId}*)
🕒 *Today (${nowInfo.dayName}, ${nowInfo.dateFormatted}):* *${todayStatus.toUpperCase()}* (Time: *${todayCheckIn}*)
📊 *Weekly:* Present: *${weeklyPresent}* | Late: *${weeklyLate}* | Absent: *${weeklyAbsent}*
📅 *Monthly Total:* Present: *${monthlyPresent}* | Late: *${monthlyLate}* | Absent: *${monthlyAbsent}* (*${attendancePct}%*)
━━━━━━━━━━━━━━━━━━━━
📎 _1st tareekh se aaj tak ka mukammal Day-by-Day, Weekly aur Monthly Attendance Register PDF mein attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 4. OFFICIAL STAFF SALARY & ADVANCE RECOVERY SLIP PDF
// ============================================================================
export function generateStaffSalarySlipPdf(
  staff: any,
  attendanceRows: any[],
  advancesRows: any[],
  monthStr?: string
): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo();

  const staffName = staff?.fullName || staff?.full_name || staff?.name || "Faculty Member";
  const staffId = staff?.id || staff?.staffId || "STF-01";
  const role = staff?.designation || staff?.role || "Faculty";
  const baseSalary = Number(staff?.salary || staff?.base_salary || staff?.baseSalary || 0);
  const activeMonth = monthStr || nowInfo.isoDate.slice(0, 7);

  const presentCount = (attendanceRows || []).filter((a: any) => a.status === "Present").length;
  const lateCount = (attendanceRows || []).filter((a: any) => a.status === "Late").length;
  const absentCount = (attendanceRows || []).filter((a: any) => a.status === "Absent").length;
  const leaveCount = (attendanceRows || []).filter((a: any) => String(a.status || "").includes("Leave")).length;

  const perDayWage = Math.round(baseSalary / 30);
  const absentDeduction = absentCount * perDayWage;
  const lateConvertedAbsents = Math.floor(lateCount / 3);
  const lateDeduction = lateConvertedAbsents * perDayWage;

  let totalAdvanceTaken = 0;
  let remainingAdvanceBalance = 0;
  let monthlyAdvanceDeduction = 0;

  const advanceHistoryRows: string[][] = [];
  (advancesRows || []).forEach((adv: any, i: number) => {
    const amt = Number(adv.amount || 0);
    const rem = Number(adv.remaining_balance ?? adv.remainingBalance ?? 0);
    const ded = Number(adv.monthly_deduction ?? adv.monthlyDeduction ?? (rem > 0 ? Math.min(rem, Math.round(amt / 3) || rem) : 0));
    totalAdvanceTaken += amt;
    remainingAdvanceBalance += rem;
    if (rem > 0) monthlyAdvanceDeduction += Math.min(rem, ded || rem);

    const dt = formatDateDayTime(adv.date_issued || adv.dateIssued || adv.date || adv.created_at);
    advanceHistoryRows.push([
      String(i + 1),
      dt.dateStr,
      dt.dayStr,
      String(adv.reason || adv.notes || "Salary Advance"),
      `Rs. ${amt.toLocaleString()}`,
      `Rs. ${rem.toLocaleString()}`,
    ]);
  });

  const totalDeductions = absentDeduction + lateDeduction + monthlyAdvanceDeduction;
  const netPayable = Math.max(0, baseSalary - totalDeductions);

  let y = drawExecutiveHeader(doc, `Official Faculty Salary & Payroll Statement (${activeMonth})`, "PAYROLL SLIP", nowInfo);

  y = drawIdentityCard(doc, y, "Verified Staff Payroll Profile", [
    { label: "Faculty Name", value: staffName },
    { label: "Staff ID", value: String(staffId) },
    { label: "Designation", value: String(role) },
    { label: "Salary Month", value: activeMonth },
    { label: "Monthly Attendance", value: `P: ${presentCount} | L: ${lateCount} | A: ${absentCount} | Leaves: ${leaveCount}` },
    { label: "Statement Date", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    { label: "Gross Base Salary", value: `Rs. ${baseSalary.toLocaleString()}`, subtext: `Per Day: Rs. ${perDayWage.toLocaleString()}`, highlight: "navy" },
    { label: "Attendance Deductions", value: `Rs. ${(absentDeduction + lateDeduction).toLocaleString()}`, subtext: `${absentCount} Absent, ${lateCount} Late`, highlight: "amber" },
    { label: "Advance Recovery", value: `Rs. ${monthlyAdvanceDeduction.toLocaleString()}`, subtext: `Rem. Bal: Rs. ${remainingAdvanceBalance.toLocaleString()}`, highlight: "crimson" },
    { label: "Net Payable Salary", value: `Rs. ${netPayable.toLocaleString()}`, subtext: `Month: ${activeMonth}`, highlight: "teal" },
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Sr#", "Payroll Component / Head", "Calculation Basis", "Type", "Amount (PKR)"]],
    body: [
      ["1", "Monthly Base Salary", "Fixed Monthly Contract", "Earning (+)", `Rs. ${baseSalary.toLocaleString()}`],
      ["2", "Absent Days Deduction", `${absentCount} Absent Day(s) × Rs. ${perDayWage.toLocaleString()}`, "Deduction (-)", `Rs. ${absentDeduction.toLocaleString()}`],
      ["3", "Late Arrival Adjustment", `${lateCount} Late(s) (${lateConvertedAbsents} day eq.)`, "Deduction (-)", `Rs. ${lateDeduction.toLocaleString()}`],
      ["4", "Advance Salary Recovery", `Active Advance Balance: Rs. ${remainingAdvanceBalance.toLocaleString()}`, "Recovery (-)", `Rs. ${monthlyAdvanceDeduction.toLocaleString()}`],
      ["", "NET PAYABLE SALARY", `Issued on ${nowInfo.dateFormatted} (${nowInfo.timeFormatted})`, "NET TOTAL", `Rs. ${netPayable.toLocaleString()}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [236, 253, 245];
        data.cell.styles.textColor = [6, 78, 59];
      }
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 55;
  if (advanceHistoryRows.length > 0 && finalY < 225) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(11, 36, 71);
    doc.text("SALARY ADVANCE HISTORY & REMAINING BALANCE LEDGER", 14, finalY + 8);

    autoTable(doc, {
      startY: finalY + 11,
      head: [["Sr#", "Date Issued", "Day", "Particulars / Reason", "Advance Taken", "Remaining Balance"]],
      body: advanceHistoryRows,
      theme: "grid",
      headStyles: { fillColor: [6, 78, 67], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Salary_Slip_${toSafeFilename(staffName)}_${activeMonth}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
💳 *OFFICIAL FACULTY SALARY & PAYROLL SLIP*
━━━━━━━━━━━━━━━━━━━━
👤 *Faculty:* *${staffName}* (*${role}* • ID: *${staffId}*)
📅 *Month:* *${activeMonth}* | *Attendance:* P:${presentCount} • L:${lateCount} • A:${absentCount}
💰 *Base Salary:* Rs. ${baseSalary.toLocaleString()} | *Deductions:* Rs. ${totalDeductions.toLocaleString()}
✅ *Net Payable Salary:* *Rs. ${netPayable.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━
📎 _Aap ki mukammal Salary, Attendance aur Advance Statement PDF mein attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 5. OFFICIAL STAFF TIMETABLE SCHEDULE PDF
// ============================================================================
export function generateStaffTimetablePdf(staff: any, timetableRows: any[], queryDay?: string): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo();

  const staffName = staff?.fullName || staff?.full_name || staff?.name || "Faculty Member";
  const staffId = staff?.id || staff?.staffId || "STF-01";
  const role = staff?.designation || staff?.role || "Faculty";

  let y = drawExecutiveHeader(
    doc,
    `Official Faculty Lecture Timetable ${queryDay ? `(${queryDay})` : "(Weekly Schedule)"}`,
    "LECTURE SCHEDULE",
    nowInfo
  );

  y = drawIdentityCard(doc, y, "Verified Faculty Schedule Assignment", [
    { label: "Faculty Name", value: staffName },
    { label: "Staff ID", value: String(staffId) },
    { label: "Designation", value: String(role) },
    { label: "Total Lectures", value: `${(timetableRows || []).length} Assigned Slot(s)` },
    { label: "Filter Day", value: queryDay || "All Working Days (Mon–Sat)" },
    { label: "Issued On", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
  ]);

  const rows =
    timetableRows && timetableRows.length > 0
      ? timetableRows.map((r: any, i: number) => [
          String(i + 1),
          String(r.day || "Monday - Saturday"),
          `${r.start_time || r.startTime || "08:00"} - ${r.end_time || r.endTime || "08:45"}`,
          String(r.subject || "Subject Lecture"),
          String(r.class_room || r.section || r.className || "Lecture Hall"),
        ])
      : [["1", queryDay || "Mon - Sat", "-", "No lectures currently assigned in ERP for this filter", "-"]];

  autoTable(doc, {
    startY: y,
    head: [["Sr#", "Day", "Lecture Timing", "Subject / Course", "Class Section / Room"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Faculty_Timetable_${toSafeFilename(staffName)}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
📅 *OFFICIAL FACULTY LECTURE TIMETABLE*
━━━━━━━━━━━━━━━━━━━━
👤 *Faculty:* *${staffName}* (ID: *${staffId}*)
📚 *Assigned Lectures:* *${(timetableRows || []).length} Slot(s)* ${queryDay ? `on *${queryDay}*` : "(Full Week)"}
━━━━━━━━━━━━━━━━━━━━
📎 _Aap ka mukammal Time-wise aur Room-wise Lecture Schedule PDF mein attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 6. STUDENT ATTENDANCE & ACADEMIC EXAM RESULT STATEMENT PDF
// ============================================================================
export function generateStudentAcademicReportPdf(
  student: any,
  attendanceRows: any[],
  examRecords: any[],
  focusMode: "attendance" | "marks" | "general" = "general"
): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo();

  const studentName = student?.fullName || student?.full_name || "Student";
  const fatherName = student?.fatherName || student?.father_name || "N/A";
  const rollNo = student?.collegeNo || student?.college_no || student?.id || "N/A";
  const program = student?.group || student?.groupName || student?.category || "Intermediate";
  const section = student?.section || "A";

  const presentDays =
    (attendanceRows || []).filter((a: any) => a.status === "Present").length || Number(student?.attendance_present || 0);
  const absentDays =
    (attendanceRows || []).filter((a: any) => a.status === "Absent").length || Number(student?.attendance_absent || 0);
  const lateDays = (attendanceRows || []).filter((a: any) => a.status === "Late").length;
  const leaveDays = (attendanceRows || []).filter((a: any) => String(a.status || "").includes("Leave")).length;
  const totalLogged = presentDays + absentDays + lateDays + leaveDays;
  const attPct = totalLogged > 0 ? Math.round(((presentDays + lateDays) / totalLogged) * 100) : 100;

  let totalObtained = 0;
  let totalMax = 0;
  (examRecords || []).forEach((r: any) => {
    totalObtained += Number(r.obtained_marks ?? r.obtainedMarks ?? 0);
    totalMax += Number(r.total_marks ?? r.totalMarks ?? 100);
  });
  const examPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  const title =
    focusMode === "attendance"
      ? "Official Student Attendance & Punctuality Statement"
      : focusMode === "marks"
      ? "Official Examination Result & Academic Transcript"
      : "Official Student 360° Academic & Attendance Report";

  let y = drawExecutiveHeader(doc, title, focusMode.toUpperCase(), nowInfo);

  y = drawIdentityCard(doc, y, "Verified Student Academic Profile", [
    { label: "Student Name", value: studentName },
    { label: "Father Name", value: fatherName },
    { label: "Roll / College ID", value: String(rollNo) },
    { label: "Class & Section", value: `${program} (Sec ${section})` },
    { label: "Attendance Rate", value: `${attPct}% (P:${presentDays} | A:${absentDays} | L:${lateDays})` },
    { label: "Report Date", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    { label: "Present Days", value: `${presentDays} Days`, subtext: `Late: ${lateDays} | Leave: ${leaveDays}`, highlight: "teal" },
    { label: "Absent Days", value: `${absentDays} Days`, subtext: `Attendance: ${attPct}%`, highlight: absentDays > 3 ? "crimson" : "navy" },
    { label: "Tests Evaluated", value: `${(examRecords || []).length} Exams`, subtext: `Total Marks: ${totalObtained}/${totalMax}`, highlight: "navy" },
    { label: "Overall Score %", value: totalMax > 0 ? `${examPct}%` : "N/A", subtext: examPct >= 80 ? "A+ Grade Standing" : "Regular Assessment", highlight: "amber" },
  ]);

  if (focusMode !== "attendance" && examRecords && examRecords.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(11, 36, 71);
    doc.text("SUBJECT-WISE EXAMINATION & TEST PERFORMANCE LEDGER", 14, y + 2.5);

    const examBody = examRecords.slice(0, 14).map((r: any, idx: number) => {
      const obt = Number(r.obtained_marks ?? r.obtainedMarks ?? 0);
      const tot = Number(r.total_marks ?? r.totalMarks ?? 100);
      const pct = tot > 0 ? Math.round((obt / tot) * 100) : 0;
      const dt = formatDateDayTime(r.date || r.created_at);
      return [
        String(idx + 1),
        dt.dateStr,
        dt.dayStr,
        String(r.test_name || r.testName || "Monthly Test"),
        String(r.subject || "Subject"),
        `${obt} / ${tot}`,
        `${pct}%`,
      ];
    });

    autoTable(doc, {
      startY: y + 5,
      head: [["Sr#", "Date", "Day", "Examination / Test", "Subject", "Marks", "Percentage"]],
      body: examBody,
      theme: "grid",
      headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = ((doc as any).lastAutoTable?.finalY || y + 40) + 6;
  }

  if (attendanceRows && attendanceRows.length > 0 && y < 235) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(11, 36, 71);
    doc.text("CHRONOLOGICAL ATTENDANCE LOG (DATE, DAY & TIME WISE)", 14, y + 2.5);

    const attBody = attendanceRows.slice(0, 18).map((a: any, idx: number) => {
      const dt = formatDateDayTime(a.date, a.check_in_time || a.checkIn);
      return [
        String(idx + 1),
        dt.dateStr,
        dt.dayStr,
        dt.timeStr,
        String(a.status || "Present").toUpperCase(),
        String(a.notes || "Verified"),
      ];
    });

    autoTable(doc, {
      startY: y + 5,
      head: [["Sr#", "Date", "Day", "Time", "Attendance Status", "Remarks"]],
      body: attBody,
      theme: "grid",
      headStyles: { fillColor: [6, 78, 67], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.8 },
      margin: { left: 14, right: 14 },
    });
  }

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `Student_Report_${toSafeFilename(rollNo)}_${toSafeFilename(studentName)}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
📊 *OFFICIAL STUDENT ATTENDANCE & RESULT REPORT*
━━━━━━━━━━━━━━━━━━━━
👤 *Student:* *${studentName}* S/D/O *${fatherName}* (Roll: *${rollNo}*)
📅 *Attendance:* Present: *${presentDays}* | Absent: *${absentDays}* | Rate: *${attPct}%*
📝 *Academic Standing:* *${(examRecords || []).length} Test(s)* ${totalMax > 0 ? `• Score: *${totalObtained}/${totalMax} (${examPct}%)*` : ""}
━━━━━━━━━━━━━━━━━━━━
📎 _Date & Day-wise Attendance aur Exam Results ki Official PDF Report attach hai._`;

  return { pdfBuffer, fileName, caption };
}

// ============================================================================
// 7. PRINCIPAL DAILY EXECUTIVE REPORT PDF
// ============================================================================
export function generatePrincipalExecutiveReportPdf(data: {
  principalName: string;
  totalStudents: number;
  boysCount: number;
  girlsCount: number;
  todayCollection: number;
  todayCash: number;
  todayBank: number;
  monthCollection: number;
  totalOutstanding: number;
  staffRoster: Array<{ name: string; role: string; status: string; checkIn: string }>;
  todayTransactions?: Array<{ studentName: string; rollNo: string; amount: number; mode: string; time: string }>;
}): GeneratedWhatsAppPdf {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const nowInfo = getPktNowInfo();

  const presentStaff = data.staffRoster.filter((s) => s.status === "Present").length;
  const lateStaff = data.staffRoster.filter((s) => s.status === "Late").length;
  const absentStaff = data.staffRoster.filter((s) => s.status === "Absent").length;

  let y = drawExecutiveHeader(doc, "Executive Principal Daily Institutional Audit", "EXECUTIVE BRIEF", nowInfo);

  y = drawIdentityCard(doc, y, "Executive Leadership Snapshot", [
    { label: "Executive Authority", value: data.principalName || "Principal" },
    { label: "Audit Date & Day", value: `${nowInfo.dateFormatted} (${nowInfo.dayName})` },
    { label: "Enrolled Strength", value: `${data.totalStudents} Students (Boys: ${data.boysCount} | Girls: ${data.girlsCount})` },
    { label: "Faculty Attendance", value: `Total: ${data.staffRoster.length} (P:${presentStaff} | L:${lateStaff} | A:${absentStaff})` },
  ]);

  y = drawSummaryKPIBoxes(doc, y, [
    { label: "Today's Collection", value: `Rs. ${data.todayCollection.toLocaleString()}`, subtext: `Cash: ${data.todayCash.toLocaleString()} | Bank: ${data.todayBank.toLocaleString()}`, highlight: "teal" },
    { label: "Monthly Collection", value: `Rs. ${data.monthCollection.toLocaleString()}`, subtext: nowInfo.monthLabel, highlight: "navy" },
    { label: "Total Recoverable", value: `Rs. ${data.totalOutstanding.toLocaleString()}`, subtext: "Pending Arrears", highlight: "amber" },
    { label: "Staff Present / Absent", value: `${presentStaff + lateStaff} / ${absentStaff}`, subtext: `${lateStaff} Late Arrival(s)`, highlight: absentStaff > 0 ? "crimson" : "teal" },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(11, 36, 71);
  doc.text(`LIVE FACULTY ATTENDANCE ROSTER (${nowInfo.dateFormatted.toUpperCase()} • ${nowInfo.dayName.toUpperCase()})`, 14, y + 2.5);

  const staffBody =
    data.staffRoster.length > 0
      ? data.staffRoster.slice(0, 22).map((s, idx) => [
          String(idx + 1),
          s.name,
          s.role,
          nowInfo.dateFormatted,
          s.checkIn || "-",
          s.status.toUpperCase(),
        ])
      : [["1", "No staff records found", "-", nowInfo.dateFormatted, "-", "-"]];

  autoTable(doc, {
    startY: y + 5,
    head: [["Sr#", "Faculty Member", "Designation", "Date", "Check-In Time", "Status"]],
    body: staffBody,
    theme: "grid",
    headStyles: { fillColor: [11, 36, 71], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.8 },
    margin: { left: 14, right: 14 },
  });

  drawExecutiveFooter(doc, nowInfo);

  const arrayBuffer = doc.output("arraybuffer");
  const pdfBuffer = Buffer.from(arrayBuffer);
  const fileName = `SCJ_Executive_Report_${nowInfo.isoDate}.pdf`;

  const caption =
`🏛️ *${COLLEGE_TITLE}*
👑 *PRINCIPAL DAILY EXECUTIVE AUDIT REPORT*
━━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${nowInfo.dayName}, ${nowInfo.dateFormatted} • ${nowInfo.timeFormatted}
💰 *Today's Fee Collection:* *Rs. ${data.todayCollection.toLocaleString()}* (Cash: Rs. ${data.todayCash.toLocaleString()} | Bank: Rs. ${data.todayBank.toLocaleString()})
👥 *Staff Attendance:* Present: *${presentStaff}* | Late: *${lateStaff}* | Absent: *${absentStaff}*
🎓 *Active Enrolment:* *${data.totalStudents} Students* (Boys: ${data.boysCount} | Girls: ${data.girlsCount})
━━━━━━━━━━━━━━━━━━━━
📎 _Mukammal Staff Attendance Roster aur Financial Audit PDF niche attach hai._`;

  return { pdfBuffer, fileName, caption };
}
