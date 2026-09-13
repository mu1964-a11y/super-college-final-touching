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

  const collegeName = settings?.collegeName || "Superior Group of Colleges Jahanian";
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

  const address = settings?.address || "Superior College, Khanewal Road, Jahanian";
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

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
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
_Office of the Principal, SGC Jahanian_`;

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

  const collegeName = settings?.collegeName || "Superior Group of Colleges Jahanian";
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

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
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
_Accounts & Finance Department, SGC Jahanian_`;

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

/**
 * Automatically dispatches official Fee Dues Reminder WhatsApp notice to parents
 * Includes ONLY Fee Statement link.
 */
export async function sendAutoFeeReminderNotice(
  student: any,
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

  const collegeName = settings?.collegeName || "Superior Group of Colleges Jahanian";
  const studentName = (student.fullName || "Student").trim();
  const fatherName = (student.fatherName || "Sahib").trim();
  const rollNo = student.collegeNo || student.studentId || student.id || "N/A";
  const group = student.group || student.category || "Intermediate";
  const totalPkg = Number(student.totalPackage || 0);
  const feeReceived = Number(student.feeReceived || 0);
  const balance = Math.max(0, totalPkg - feeReceived);
  const helpline = settings?.contactNumber || "0301-4455891";

  // Context-specific link: ONLY Fee Statement / Ledger
  const statementUrl = getDocumentLink("statement", rollNo, undefined, settings);

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
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
_Accounts & Finance Department, SGC Jahanian_`;

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

  const collegeName = settings?.collegeName || "Superior Group of Colleges Jahanian";
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
_Office of the Controller of Examinations, SGC Jahanian_`;

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

