import { toast } from "sonner";

/**
 * Format Pakistani / International phone number to WhatsApp standard: 923XXXXXXXXX
 */
export function formatWhatsAppPhone(rawPhone?: string): string | null {
  if (!rawPhone) return null;
  let clean = String(rawPhone).replace(/\D/g, "");
  if (!clean) return null;

  if (clean.startsWith("0092")) {
    clean = clean.slice(2);
  } else if (clean.startsWith("+92")) {
    clean = clean.slice(1);
  } else if (clean.startsWith("03") && clean.length === 11) {
    clean = "92" + clean.slice(1);
  } else if (clean.startsWith("3") && clean.length === 10) {
    clean = "92" + clean;
  } else if (!clean.startsWith("92") && clean.length === 10) {
    clean = "92" + clean;
  }

  if (clean.length < 10) return null;
  return clean;
}

/**
 * Resolves the public base URL for short preview & download document links
 */
export function getPublicBaseUrl(settings?: any): string {
  // 1. Check explicit setting for public / portal URL if configured
  const explicitUrl = 
    settings?.portalUrl || 
    settings?.appUrl || 
    settings?.publicUrl || 
    settings?.portal_url || 
    settings?.app_url ||
    settings?.config?.portalUrl || 
    settings?.config?.appUrl;

  if (explicitUrl && typeof explicitUrl === "string" && explicitUrl.trim()) {
    return explicitUrl.trim().replace(/\/+$/, "");
  }

  // 2. Check window.location if running in a public browser environment (not localhost / LAN)
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    const hostname = window.location.hostname.toLowerCase();
    const isLocal = 
      hostname === "localhost" || 
      hostname === "127.0.0.1" || 
      hostname.startsWith("192.168.") || 
      hostname.startsWith("10.") || 
      hostname.endsWith(".local") ||
      window.location.protocol === "file:";
    if (!isLocal) {
      return origin.replace(/\/+$/, "");
    }
  }

  // 3. Fallback to college website configured in settings
  if (settings?.website && typeof settings.website === "string" && settings.website.trim()) {
    let site = settings.website.trim().toLowerCase();
    // If site contains superiorjhn.com, the web app is hosted at portal.superiorjhn.com
    if (site.includes("superiorjhn.com")) {
      return "https://portal.superiorjhn.com";
    }
    if (!site.startsWith("http://") && !site.startsWith("https://")) {
      site = `https://${site}`;
    }
    return site.replace(/\/+$/, "");
  }

  // 4. Default fallback: window.location.origin if available, else official college portal domain
  if (typeof window !== "undefined" && window.location?.origin && window.location.protocol !== "file:") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "https://portal.superiorjhn.com";
}

/**
 * Builds ultra-short, context-specific document preview & download link
 * Examples:
 * - Admission: /?v=admission&id=1015
 * - Fee Receipt: /?v=receipt&id=1015&rcp=REC-123456
 * - Fee Statement: /?v=statement&id=1015
 * - Result Card: /?v=result&id=1015&m=Sep-2026
 * - Attendance: /?v=attendance&id=1015
 */
export function getDocumentLink(
  docType: "receipt" | "statement" | "admission" | "result" | "attendance" | "student",
  identifier: string,
  extra?: { rcp?: string; m?: string },
  settings?: any
): string {
  const base = getPublicBaseUrl(settings);
  const cleanId = encodeURIComponent(String(identifier || "").trim());
  let url = `${base}/?v=${docType}&id=${cleanId}`;
  if (docType === "receipt" && extra?.rcp) {
    url += `&rcp=${encodeURIComponent(String(extra.rcp).trim())}`;
  }
  if (docType === "result" && extra?.m) {
    url += `&m=${encodeURIComponent(String(extra.m).trim())}`;
  }
  return url;
}

export interface AutoAdmissionOptions {
  silent?: boolean;
  manualTrigger?: boolean;
}

export function buildAdmissionNoticeMessage(admission: any, settings?: any): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const session = admission.session || settings?.academicSession || "2026-28";
  const studentName = (admission.fullName || "Student").trim();
  const fatherName = (admission.fatherName || "Sahib").trim();
  const studentId = admission.studentId || admission.id || "Allotted on Portal";
  const collegeNo = admission.collegeNo || admission.rollNo || "Allotted on Orientation";
  const group = admission.group || admission.category || "Intermediate";
  const section = admission.section ? `Section ${admission.section}` : "Section A";

  // Format subjects list
  let subjectsList = "Compulsory & Elective Subjects";
  if (Array.isArray(admission.subjects) && admission.subjects.length > 0) {
    subjectsList = admission.subjects.filter(Boolean).join(", ");
  } else if (typeof admission.subjects === "string" && admission.subjects.trim()) {
    subjectsList = admission.subjects.trim();
  }

  const totalPkgNum = Number(admission.totalPackage || 0);
  const feeRcvNum = Number(admission.feeReceived || 0);
  const totalPkg = totalPkgNum.toLocaleString();
  const paid = feeRcvNum.toLocaleString();
  const balance = Math.max(0, totalPkgNum - feeRcvNum).toLocaleString();

  const concessionLine = admission.concessionReason 
    ? `• *Scholarship / Category:* ${admission.concessionReason}\n` 
    : "";

  const address = settings?.address || "Superior College, Canal Road, Jahanian";
  const helpline = settings?.contactNumber || "0301-4455891";

  // Build Context-Specific Links (ONLY Admission Slip & Initial Fee Receipt if paid)
  const primaryId = collegeNo !== "Allotted on Orientation" ? collegeNo : (studentId !== "Allotted on Portal" ? studentId : (admission.id || ""));
  const admissionSlipUrl = getDocumentLink("admission", primaryId, undefined, settings);
  
  let docLinksSection = `\n📄 *Official Admission Slip:* ${admissionSlipUrl}`;
  if (feeRcvNum > 0) {
    const rcpNo = admission.receiptId || admission.receiptNo || `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
    const feeReceiptUrl = getDocumentLink("receipt", primaryId, { rcp: rcpNo }, settings);
    docLinksSection += `\n🧾 *Admission Fee Receipt:* ${feeReceiptUrl}`;
  }

  return `🏛️ *${collegeName.toUpperCase()}*
🎓 *OFFICIAL ADMISSION CONFIRMATION NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

Mubarak ho! *${studentName.toUpperCase()}* ka dakhla Superior College Jahanian mein kamyabi se confirm ho chuka hai.

📋 *Enrollment & Academic Details:*
• *Student Name:* ${studentName}
• *Father Name:* ${fatherName}
• *Student ID:* ${studentId}
• *College Roll No:* ${collegeNo}
• *Class / Program:* ${group}
• *Assigned Section:* ${section}
• *Academic Session:* ${session}
• *Enrolled Subjects:* ${subjectsList}
${concessionLine}━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Fee Ledger Details:*
• *Agreed Package:* Rs. ${totalPkg}
• *Fee Deposited:* Rs. ${paid}
• *Remaining Balance:* Rs. ${balance}
━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Document Verification & Download:*${docLinksSection}
━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Campus Address:* ${address}
📞 *Helpline / Query:* ${helpline}
_Office of the Principal, Superior College Jahanian_`;
}

/**
 * Automatically dispatches official Admission Confirmation WhatsApp notice to parents
 * Includes: Student ID, Roll No, Class, Section, Subjects, Session, Fee details, and ONLY Admission Slip / Receipt links.
 */
export async function sendAutoAdmissionNotice(
  admission: any,
  settings?: any,
  options?: AutoAdmissionOptions
): Promise<boolean> {
  if (!admission) return false;

  // Check setting toggle if present (defaults to true)
  if (!options?.manualTrigger && settings?.autoWhatsAppAdmission === false) {
    return false;
  }

  const rawPhone = admission.fatherContact || admission.contactNumber || admission.phone || admission.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const studentName = (admission.fullName || "Student").trim();
  const message = buildAdmissionNoticeMessage(admission, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number registered for ${studentName}. Admission notice skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Automatic WhatsApp Admission Notice sent to +${phone}!`, { id: "adm-wa" });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to open WhatsApp Web.", {
          id: "adm-wa",
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoAdmissionNotice network error:", error);
    if (!options?.silent) {
      toast.info("WhatsApp Gateway not reachable. Click to open WhatsApp Web.", {
        id: "adm-wa",
        action: {
          label: "Open WhatsApp",
          onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
        },
      });
    }
    return false;
  }
}

export interface AutoFeePaymentDetails {
  receiptId?: string;
  amountPaid: number;
  datePaid?: string;
  feeType?: string;
  remainingBalance?: number;
  paymentMethod?: string;
  collectedBy?: string;
}

export function buildFeeReceiptMessage(
  studentOrAdmission: any,
  paymentDetails: AutoFeePaymentDetails,
  settings?: any
): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (studentOrAdmission.fullName || "Student").trim();
  const fatherName = (studentOrAdmission.fatherName || "Sahib").trim();
  const rollNo = studentOrAdmission.collegeNo || studentOrAdmission.studentId || studentOrAdmission.id || "N/A";
  const group = studentOrAdmission.group || studentOrAdmission.category || "Intermediate";

  const receiptNo = paymentDetails.receiptId || `REC-${Math.floor(100000 + Math.random() * 900000)}`;
  const amountPaid = Number(paymentDetails.amountPaid || 0).toLocaleString();
  const payDate = paymentDetails.datePaid 
    ? new Date(paymentDetails.datePaid).toLocaleDateString("en-GB") 
    : new Date().toLocaleDateString("en-GB");
  const feeType = paymentDetails.feeType || "College Fee Deposit";

  let remainingBal = 0;
  if (typeof paymentDetails.remainingBalance === "number") {
    remainingBal = Math.max(0, paymentDetails.remainingBalance);
  } else {
    const totalPkg = Number(studentOrAdmission.totalPackage || 0);
    const existingReceived = Number(studentOrAdmission.feeReceived || 0);
    remainingBal = Math.max(0, totalPkg - (existingReceived + Number(paymentDetails.amountPaid || 0)));
  }

  const helpline = settings?.contactNumber || "0301-4455891";

  // Context-specific links: ONLY Fee Receipt & Fee Statement
  const receiptUrl = getDocumentLink("receipt", rollNo, { rcp: receiptNo }, settings);
  const statementUrl = getDocumentLink("statement", rollNo, undefined, settings);

  return `🏛️ *${collegeName.toUpperCase()}*
🧾 *OFFICIAL FEE PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

Aapke bache ki fee payment kamyabi se record ho chuki hai.

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class / Group:* ${group}
• *Receipt No:* ${receiptNo}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Amount Received:* *Rs. ${amountPaid}*
• *Payment Date:* ${payDate}
• *Payment Head:* ${feeType}
• *Remaining Balance:* Rs. ${remainingBal.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━
🧾 *Computerized Fee Receipt:*
${receiptUrl}

📊 *Complete Fee Statement / Ledger:*
${statementUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Payment verified & registered in official accounts ledger.
📞 Accounts Desk: ${helpline}
_Accounts & Finance Department, Superior College Jahanian_`;
}

/**
 * Automatically dispatches official Computerized Fee Payment Receipt WhatsApp notice to parents
 * Triggered on any fee collection or installment submission.
 * Includes ONLY Fee Receipt link & Fee Statement link.
 */
export async function sendAutoFeeReceiptNotice(
  studentOrAdmission: any,
  paymentDetails: AutoFeePaymentDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!studentOrAdmission || !paymentDetails) return false;

  // Check setting toggle if present (defaults to true)
  if (!options?.manualTrigger && settings?.autoWhatsAppFeePayment === false) {
    return false;
  }

  const rawPhone = studentOrAdmission.fatherContact || 
    studentOrAdmission.contact || 
    studentOrAdmission.contactNumber || 
    studentOrAdmission.phone || 
    studentOrAdmission.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const studentName = (studentOrAdmission.fullName || "Student").trim();
  const message = buildFeeReceiptMessage(studentOrAdmission, paymentDetails, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number registered for ${studentName}. Receipt notice skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Official WhatsApp Fee Receipt dispatched to +${phone}!`, { id: "fee-wa-receipt" });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share receipt.", {
          id: "fee-wa-receipt",
          action: {
            label: "Share Receipt",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoFeeReceiptNotice network error:", error);
    if (!options?.silent) {
      toast.info("WhatsApp Gateway not reachable. Click to share receipt.", {
        id: "fee-wa-receipt",
        action: {
          label: "Share Receipt",
          onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
        },
      });
    }
    return false;
  }
}

export function buildFeeReminderMessage(
  student: any,
  balanceAmount?: number,
  settings?: any
): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const totalPkg = Number(student.totalPackage || 0);
  const feeReceived = Number(student.feeReceived || 0);
  const balance = typeof balanceAmount === "number" ? balanceAmount : Math.max(0, totalPkg - feeReceived);
  const helpline = settings?.contactNumber || "0301-4455891";

  // Context-specific link: ONLY Fee Statement / Ledger
  const statementUrl = getDocumentLink("statement", rollNo, undefined, settings);

  return `🏛️ *${collegeName.toUpperCase()}*
📄 *OFFICIAL FEE REMINDER & ACCOUNT STATEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

Aapke bache ka fee ledger baqaya darj zail hai:

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class / Group:* ${group}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Agreed Package:* Rs. ${totalPkg.toLocaleString()}
• *Fee Deposited:* Rs. ${feeReceived.toLocaleString()}
• *Outstanding Balance:* *Rs. ${balance.toLocaleString()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Online Fee Statement / Ledger:*
${statementUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ *Instruction:* Baraye meherbani aakhri tareekh se qabal accounts desk par baqaya fee jama karwa kar computerised receipt hasil karein.
📞 Accounts Desk: ${helpline}
_Accounts & Finance Department, Superior College Jahanian_`;
}

/**
 * Automatically dispatches official Fee Dues Reminder WhatsApp notice to parents
 * Includes ONLY Fee Statement link.
 */
export async function sendAutoFeeReminderNotice(
  student: any,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean; balance?: number }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const studentName = (student.fullName || "Student").trim();
  const message = buildFeeReminderMessage(student, options?.balance, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number registered for ${studentName}. Reminder skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Fee reminder dispatched via WhatsApp to +${phone}!`, { id: "fee-reminder-wa" });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share reminder.", {
          id: "fee-reminder-wa",
          action: {
            label: "Share Reminder",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoFeeReminderNotice network error:", error);
    if (!options?.silent) {
      toast.info("WhatsApp Gateway not reachable. Click to share reminder.", {
        id: "fee-reminder-wa",
        action: {
          label: "Share Reminder",
          onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
        },
      });
    }
    return false;
  }
}

export interface AutoResultDetails {
  month?: string;
  testTitle?: string;
  marksListText?: string;
  totalObtained?: number;
  totalMax?: number;
  percentage?: number;
  statusText?: string;
}

/**
 * Automatically dispatches official Academic Result Card WhatsApp notice to parents
 * Includes ONLY Academic Result Card link.
 */
export async function sendAutoResultNotice(
  student: any,
  details: AutoResultDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);

  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const month = details.month || "Current Term";
  const helpline = settings?.contactNumber || "0301-4455891";

  // Context-specific link: ONLY Academic Result Card
  const resultUrl = getDocumentLink("result", rollNo, { m: month }, settings);

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
📊 *OFFICIAL ACADEMIC ASSESSMENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
• *Assessment Term:* ${month}
━━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Subject-wise Examination Scores:*
${details.marksListText || "• Assessment scores registered on portal."}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Grand Total:* ${details.totalObtained ?? "-"} / ${details.totalMax ?? "-"} (${details.percentage ?? 0}%)
• *Result Status:* ${details.statusText || "Evaluated"}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Official Academic Result Card:*
${resultUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Instruction:* Board imtehanat mein aala position ke liye rozana revision aur regular attendance yaqeeni banayein.
📞 Academic Helpdesk: ${helpline}
_Office of the Controller of Examinations, Superior College Jahanian_`;

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number registered for ${studentName}. Result card skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Academic Result Card dispatched to +${phone}!`, { id: "result-wa" });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share result.", {
          id: "result-wa",
          action: {
            label: "Share Result",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoResultNotice network error:", error);
    if (!options?.silent) {
      toast.info("WhatsApp Gateway not reachable. Click to share result.", {
        id: "result-wa",
        action: {
          label: "Share Result",
          onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
        },
      });
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAILY ATTENDANCE NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoDailyAttendanceDetails {
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave' | 'Holiday' | string;
  notes?: string;
}

export function buildDailyAttendanceMessage(student: any, details: AutoDailyAttendanceDetails, settings?: any): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const dateStr = details.date || new Date().toISOString().split('T')[0];
  const helpline = settings?.contactNumber || "0301-4455891";

  const statusBadge = details.status === 'Present' 
    ? '✅ HAZIR (Present)' 
    : details.status === 'Absent' 
      ? '🚨 GHAIR HAZIR (Absent)' 
      : details.status === 'Late' 
        ? '⏰ LATE (Tawkheer)' 
        : details.status === 'Leave' 
          ? '📝 RUKHSAT (On Leave)' 
          : `${String(details.status).toUpperCase()}`;

  const attendanceUrl = getDocumentLink("attendance", rollNo, undefined, settings);

  let remarkText = "";
  if (details.status === 'Absent') {
    remarkText = "\n⚠️ *Tawajjah Farmaiye:* Aapka bacha aaj baghair kisi ittela ke college se ghair hazir raha hai. Baraye meherbani foran college administration ya class teacher se rabta karein.";
  } else if (details.status === 'Late') {
    remarkText = "\n⚠️ *Hidayat:* Bacha aaj college auqat se dair se pohancha hai. Regular timing ki pabandi yaqeeni banayein.";
  } else if (details.notes) {
    remarkText = `\n📝 *Notes:* ${details.notes}`;
  }

  return `🏛️ *${collegeName.toUpperCase()}*
📋 *DAILY STUDENT ATTENDANCE NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

Aapke bache ki aaj ki rozana hazri status darj zail hai:

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
• *Date:* ${dateStr}
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Daily Attendance Status:* *${statusBadge}*${remarkText}
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Online Attendance Dossier & History:*
${attendanceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
📞 College Helpline: ${helpline}
_Student Affairs & Attendance Desk, SCJ_`;
}

export async function sendAutoDailyAttendanceNotice(
  student: any,
  details: AutoDailyAttendanceDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildDailyAttendanceMessage(student, details, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number for ${student.fullName || 'Student'}. Attendance alert skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Attendance alert sent for ${student.fullName}!`, { id: `att-wa-${student.id}` });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share attendance.", {
          id: `att-wa-${student.id}`,
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoDailyAttendanceNotice network error:", error);
    if (!options?.silent) {
      toast.info("WhatsApp Gateway not reachable. Click to open WhatsApp.", {
        id: `att-wa-${student.id}`,
        action: {
          label: "Open WhatsApp",
          onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
        },
      });
    }
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIODIC (WEEKLY / MONTHLY) ATTENDANCE REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoPeriodicAttendanceDetails {
  period: 'weekly' | 'monthly';
  periodLabel: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  holiday?: number;
  totalWorkingDays: number;
  percentage?: number;
}

export function buildPeriodicAttendanceMessage(
  student: any, 
  details: AutoPeriodicAttendanceDetails, 
  settings?: any
): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const helpline = settings?.contactNumber || "0301-4455891";

  const totalDays = details.totalWorkingDays || (details.present + details.absent + details.late + details.leave) || 1;
  const pct = details.percentage !== undefined 
    ? details.percentage 
    : Math.round(((details.present + details.late) / Math.max(1, totalDays)) * 100);

  const evalRemark = pct >= 85 
    ? "🌟 *Excellent Attendance Track Record!*" 
    : pct >= 75 
      ? "👍 *Satisfactory (Regular revision required)*" 
      : "🚨 *CRITICAL SHORTAGE:* Board exams eligibility ke liye minimum 75% hazri lazmi hai.";

  const attendanceUrl = getDocumentLink("attendance", rollNo, undefined, settings);

  return `🏛️ *${collegeName.toUpperCase()}*
📊 *${details.period.toUpperCase()} ATTENDANCE SUMMARY REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
• *Report Period:* ${details.periodLabel}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Attendance Performance Overview:*
• *Total Working Days:* ${totalDays}
• *Days Present:* ${details.present} ✅
• *Days Late:* ${details.late} ⏰
• *Days Absent:* ${details.absent} 🚨
• *Approved Leaves:* ${details.leave} 📝
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Net Attendance Ratio:* *${pct}%*
• *Performance Status:* ${evalRemark}
━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *Detailed Attendance Verification Ledger:*
${attendanceUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Zaroori Hidayat:* Board imtehanat mein admission bhejne ke liye 75% hazri qanoonan lazmi hai.
📞 Attendance Office: ${helpline}
_Academic Administration, Superior College Jahanian_`;
}

export async function sendAutoPeriodicAttendanceReport(
  student: any,
  details: AutoPeriodicAttendanceDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildPeriodicAttendanceMessage(student, details, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number for ${student.fullName || 'Student'}. Summary skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Monthly attendance summary dispatched to +${phone}!`, { id: `att-m-${student.id}` });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share.", {
          id: `att-m-${student.id}`,
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoPeriodicAttendanceReport network error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE TEST / BATCH MARKS NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoTestMarksDetails {
  subject: string;
  testType: string;
  date: string;
  totalMarks: number;
  obtainedMarks: number | string;
  percentage?: number;
  grade?: string;
  rank?: number;
  remarks?: string;
}

export function buildTestMarksMessage(student: any, details: AutoTestMarksDetails, settings?: any): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const helpline = settings?.contactNumber || "0301-4455891";

  const numObtained = Number(details.obtainedMarks) || 0;
  const total = Number(details.totalMarks) || 50;
  const pct = details.percentage ?? Math.round((numObtained / Math.max(1, total)) * 100);
  const grade = details.grade || (pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F');
  const rankStr = details.rank === 1 ? '🥇 1st Position' : details.rank === 2 ? '🥈 2nd Position' : details.rank === 3 ? '🥉 3rd Position' : details.rank ? `Position #${details.rank}` : '';
  const status = pct >= 50 ? 'PASSED (Kamyab) ✅' : 'NEEDS ATTENTION (Mehnat Darkar) ⚠️';

  const resultUrl = getDocumentLink("result", rollNo, { m: details.date }, settings);

  const posLine = rankStr ? `• *Class Position:* ${rankStr}\n` : '';
  const remLine = details.remarks ? `• *Teacher Remarks:* ${details.remarks}\n` : '';

  return `🏛️ *${collegeName.toUpperCase()}*
📝 *OFFICIAL TEST ASSESSMENT REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

Aapke bache ke haaliyah test ke nataij darj zail hain:

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
• *Subject:* ${details.subject}
• *Test Type:* ${details.testType} (${details.date})
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Obtained Marks:* *${details.obtainedMarks} / ${total}* (${pct}%)
• *Assigned Grade:* *${grade}*
${posLine}${remLine}• *Result Status:* ${status}
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Official Online Result Card:*
${resultUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 *Hidayat:* Kam marks ki soorat mein revision aur teacher guidance session attend karein.
📞 Academic Helpdesk: ${helpline}
_Office of the Controller of Examinations, SCJ_`;
}

export async function sendAutoTestMarksNotice(
  student: any,
  details: AutoTestMarksDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildTestMarksMessage(student, details, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number for ${student.fullName || 'Student'}. Result skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Result dispatched to parent of ${student.fullName}!`, { id: `res-t-${student.id}` });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share.", {
          id: `res-t-${student.id}`,
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoTestMarksNotice error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS MERIT LIST & POSITION NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoMeritPositionDetails {
  month: string;
  rank: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  testsTaken: number;
  subject?: string;
}

export function buildMeritPositionMessage(student: any, details: AutoMeritPositionDetails, settings?: any): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const helpline = settings?.contactNumber || "0301-4455891";

  const posMedal = details.rank === 1 ? '🥇 FIRST POSITION (1st)' : details.rank === 2 ? '🥈 SECOND POSITION (2nd)' : details.rank === 3 ? '🥉 THIRD POSITION (3rd)' : `Class Position #${details.rank}`;

  const resultUrl = getDocumentLink("result", rollNo, { m: details.month }, settings);

  return `🏛️ *${collegeName.toUpperCase()}*
🏆 *OFFICIAL CLASS MERIT & POSITION NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

🌟 *Mubarakbaad!* Superior College Jahanian academic evaluation ke tehat aapke bache ka merit position report:

• *Student Name:* *${studentName.toUpperCase()}*
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
• *Assessment Term:* ${details.month}
━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 *ACHIEVED CLASS POSITION:* *${posMedal}*
━━━━━━━━━━━━━━━━━━━━━━━━━
• *Aggregate Score:* ${details.totalScore} / ${details.maxScore}
• *Percentage:* *${details.percentage.toFixed(1)}%*
• *Aggregate Grade:* *${details.grade}*
• *Tests Evaluated:* ${details.testsTaken} Tests
━━━━━━━━━━━━━━━━━━━━━━━━━
📈 *Complete Verified Result Card:*
${resultUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Administration and Faculty Superior College Jahanian wish congratulations on this academic performance!
📞 Academic Helpdesk: ${helpline}
_Office of the Principal, Superior College Jahanian_`;
}

export async function sendAutoMeritPositionNotice(
  student: any,
  details: AutoMeritPositionDetails,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  if (!student) return false;

  const rawPhone = student.fatherContact || 
    student.contact || 
    student.contactNumber || 
    student.phone || 
    student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildMeritPositionMessage(student, details, settings);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number for ${student.fullName || 'Student'}. Merit alert skipped.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`Merit Position card sent for ${student.fullName}!`, { id: `merit-${student.id}` });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "WhatsApp Gateway offline. Click to share.", {
          id: `merit-${student.id}`,
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch (error) {
    console.warn("sendAutoMeritPositionNotice error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL BULK WHATSAPP DISPATCHER QUEUE
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkDispatchItem {
  id: string;
  name: string;
  phone: string;
  message: string;
  subtitle?: string;
}

export interface BulkDispatchOptions {
  items: BulkDispatchItem[];
  delaySeconds?: number;
  onProgress?: (progress: {
    total: number;
    sent: number;
    failed: number;
    currentIndex: number;
    currentItem?: BulkDispatchItem;
    status: 'running' | 'paused' | 'completed' | 'cancelled';
  }) => void;
  signal?: AbortSignal;
}

export async function dispatchBulkWhatsAppQueue(options: BulkDispatchOptions): Promise<{
  total: number;
  sent: number;
  failed: number;
}> {
  const { items, delaySeconds = 2.5, onProgress, signal } = options;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      onProgress?.({ total: items.length, sent, failed, currentIndex: i, status: 'cancelled' });
      break;
    }

    const item = items[i];
    onProgress?.({
      total: items.length,
      sent,
      failed,
      currentIndex: i,
      currentItem: item,
      status: 'running'
    });

    const cleanPhone = formatWhatsAppPhone(item.phone);
    if (!cleanPhone) {
      failed++;
      continue;
    }

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, message: item.message }),
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    // Delay between items to avoid rate limiting
    if (i < items.length - 1 && !signal?.aborted) {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
    }
  }

  onProgress?.({
    total: items.length,
    sent,
    failed,
    currentIndex: items.length,
    status: 'completed'
  });

  return { total: items.length, sent, failed };
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADS FOLLOW-UP & ADMISSION INQUIRY NOTICES
// ─────────────────────────────────────────────────────────────────────────────

export function buildLeadFollowUpMessage(lead: any, settings?: any, customNote?: string): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (lead.studentName || "Student").trim();
  const fatherName = lead.fatherName ? `Mr. ${lead.fatherName}` : "Respected Parent";
  const currentClass = lead.currentClass || "College Admission";
  const previousSchool = lead.previousSchool ? `\n• *Previous School:* ${lead.previousSchool}` : "";
  const feeLine = lead.finalizedFee ? `\n• *Agreed Package Fee:* Rs. ${Number(lead.finalizedFee).toLocaleString()}` : "";
  const address = settings?.address || "Canal Road, Jahanian";
  const helpline = settings?.contactNumber || "0301-4455891";

  let noteSection = "";
  if (customNote && customNote.trim()) {
    noteSection = `\n📢 *Special Notice:* ${customNote.trim()}\n`;
  }

  return `🏛️ *${collegeName.toUpperCase()}*
🎓 *ADMISSION INQUIRY & INFORMATION DESK*
━━━━━━━━━━━━━━━━━━━━━━━━━
Assalam-o-Alaikum ${fatherName} sb,

Yeh rasmi rabta *Superior College Jahanian* ki janib se *${studentName}* ke dakhlay (*${currentClass}*) ke silsilay mein hai.${previousSchool}${feeLine}

• *Academic Programs:* FSc (Pre-Medical / Pre-Engineering), ICS, I.Com, FA IT, BS Degrees
• *Campuses:* Dedicated Separate Boys & Girls Campuses with Modern AC Classrooms & Labs
• *Scholarships:* Special fee concessions available on matric marks and high performance!
${noteSection}━━━━━━━━━━━━━━━━━━━━━━━━━
Prospectus aur admission guidance ke liye hamare admission office tashreef layen ya is helpline number par rabta karein.
📍 *Campus Address:* ${address}
📞 *Admission Helpline:* ${helpline}
_Admissions Directorate, Superior College Jahanian_`;
}

export async function sendAutoLeadFollowUpNotice(
  lead: any,
  settings?: any,
  options?: { customNote?: string; silent?: boolean }
): Promise<boolean> {
  if (!lead) return false;
  const rawPhone = lead.fatherPhone || lead.phone || lead.contact || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildLeadFollowUpMessage(lead, settings, options?.customNote);

  if (!phone) {
    if (!options?.silent) {
      toast.warning(`No valid phone number for ${lead.studentName || 'Lead'}.`);
    }
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      toast.success(`WhatsApp message sent to ${lead.studentName || 'Lead'}!`, { id: `lead-${lead.id}` });
      return true;
    } else {
      const err = await res.json().catch(() => ({}));
      if (!options?.silent) {
        toast.info(err.error || "Gateway offline. Opening WhatsApp Web...", {
          id: `lead-${lead.id}`,
          action: {
            label: "Open WhatsApp",
            onClick: () => window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank"),
          },
        });
      }
      return false;
    }
  } catch {
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT GENERAL CIRCULARS & NOTICES
// ─────────────────────────────────────────────────────────────────────────────

export function buildStudentNoticeMessage(
  student: any,
  notice: { title: string; content: string },
  settings?: any
): string {
  const collegeName = settings?.collegeName || "Superior College Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const section = student.section ? ` (Sec: ${student.section})` : "";
  const address = settings?.address || "Canal Road, Jahanian";
  const helpline = settings?.contactNumber || "0301-4455891";

  const studentPortalUrl = getDocumentLink("student", rollNo, undefined, settings);

  return `🏛️ *${collegeName.toUpperCase()}*
📢 *OFFICIAL STUDENT CIRCULAR & ANNOUNCEMENT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Dear Parent/Guardian (${fatherName}),

• *Student Name:* ${studentName}
• *Roll Number:* ${rollNo}
• *Class & Section:* ${group}${section}
━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Subject: ${notice.title}*

${notice.content}
━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 *Online Student Portal Dossier:*
${studentPortalUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Campus Address:* ${address}
📞 *Helpline / Desk:* ${helpline}
_Administration Office, Superior College Jahanian_`;
}

export async function sendAutoStudentNotice(
  student: any,
  notice: { title: string; content: string },
  settings?: any,
  options?: { silent?: boolean }
): Promise<boolean> {
  if (!student) return false;
  const rawPhone = student.fatherContact || student.contact || student.phone || student.mobile || "";
  const phone = formatWhatsAppPhone(rawPhone);
  const message = buildStudentNoticeMessage(student, notice, settings);

  if (!phone) {
    if (!options?.silent) toast.warning(`No phone number for ${student.fullName || 'Student'}`);
    return false;
  }

  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
    if (res.ok) {
      toast.success(`Circular notice sent to ${student.fullName}!`, { id: `stu-${student.id}` });
      return true;
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank");
      return false;
    }
  } catch {
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, "_blank");
    return false;
  }
}



