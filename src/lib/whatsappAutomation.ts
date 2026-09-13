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

export interface AutoAdmissionOptions {
  silent?: boolean;
  manualTrigger?: boolean;
}

/**
 * Automatically dispatches official Admission Confirmation WhatsApp notice to parents
 * Includes: Student ID, Roll No, Class, Section, Subjects, Session, Fee details, Orientation.
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

  const totalPkg = Number(admission.totalPackage || 0).toLocaleString();
  const paid = Number(admission.feeReceived || 0).toLocaleString();
  const balance = Math.max(0, Number(admission.totalPackage || 0) - Number(admission.feeReceived || 0)).toLocaleString();

  const concessionLine = admission.concessionReason 
    ? `• *Scholarship / Category:* ${admission.concessionReason}\n` 
    : "";

  const address = settings?.address || "Superior College, Khanewal Road, Jahanian";
  const helpline = settings?.contactNumber || "0301-4455891";

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
🎓 *OFFICIAL ADMISSION CONFIRMATION NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mohtaram Walid/Guardian (${fatherName}),

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

  const message = 
`🏛️ *${collegeName.toUpperCase()}*
🧾 *OFFICIAL FEE PAYMENT RECEIPT*
━━━━━━━━━━━━━━━━━━━━━━━━━
Mohtaram Walid/Guardian (${fatherName}),

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
