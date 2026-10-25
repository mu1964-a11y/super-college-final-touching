import { toast } from 'sonner';

export function formatWhatsAppPhone(raw?: string | null): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0092')) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = '92' + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith('3')) digits = '92' + digits;
  return digits;
}

export function getDocumentLink(
  type: 'admission' | 'receipt' | 'result' | string,
  id: string,
  params?: Record<string, string>,
  settings?: any
): string {
  const origin =
    settings?.portalUrl ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://superiorcollegejahanian.edu.pk');
  const search = new URLSearchParams({ verify: type, id: String(id || '') });
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.set(k, String(v));
    });
  }
  return `${origin}/?${search.toString()}`;
}

async function dispatchWhatsAppMessage(
  phone: string,
  message: string,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<{ success: boolean; phone: string; error?: string }> {
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    if (!options?.silent) toast.error('Valid WhatsApp phone number not found.');
    return { success: false, phone: cleanPhone, error: 'Invalid phone number' };
  }

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: cleanPhone, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      if (!options?.silent) {
        toast.success(`WhatsApp notice sent to +${cleanPhone}`);
      }
      return { success: true, phone: cleanPhone };
    }
    const errMsg = data?.error || 'WhatsApp server not connected';
    if (options?.manualTrigger && !options?.silent) {
      toast.error(errMsg);
    }
    return { success: false, phone: cleanPhone, error: errMsg };
  } catch (err: any) {
    const errMsg = err?.message || 'Network error';
    if (options?.manualTrigger && !options?.silent) {
      toast.error(`WhatsApp send failed: ${errMsg}`);
    }
    return { success: false, phone: cleanPhone, error: errMsg };
  }
}

export function buildAdmissionNoticeMessage(admission: any, settings?: any): string {
  const collegeName = settings?.collegeName || 'Superior College Jahanian';
  const name = admission?.fullName || 'Student';
  const father = admission?.fatherName ? ` S/D/O ${admission.fatherName}` : '';
  const group = admission?.group || admission?.course || admission?.category || 'Academic Program';
  const rollNo = admission?.collegeNo || admission?.studentId || admission?.rollNo || admission?.id || 'Assigned Soon';
  const totalPkg = Number(admission?.totalPackage || admission?.total_package || 0);
  const feePaid = Number(admission?.feeReceived || admission?.admissionFee || admission?.fee_received || 0);
  const balance = Math.max(0, totalPkg - feePaid);
  const hasPhoto = Boolean(admission?.photo || admission?.photoUrl || admission?.photo_url);
  const verifyLink = getDocumentLink('admission', rollNo, { ref: admission?.id || '' }, settings);

  let msg = `*${collegeName.toUpperCase()}*\n*OFFICIAL ADMISSION CONFIRMATION*\n\nDear Parents / *${name}*${father},\nCongratulations! Your admission in *${group}* (Session ${admission?.session || '2026-28'}) is confirmed.\n\n*Roll / College ID:* ${rollNo}\n*Total Package:* Rs. ${totalPkg.toLocaleString()}\n*Fee Received:* Rs. ${feePaid.toLocaleString()}\n*Remaining Balance:* Rs. ${balance.toLocaleString()}\n\n*Digital Admission Slip:* ${verifyLink}`;

  if (!hasPhoto) {
    msg += `\n\n📸 *Profile Photo Required:* Please reply to this WhatsApp message with a clear passport-size photo of *${name}* along with Roll No *${rollNo}* so we can activate Smart Gate Face Attendance & Student ID Card.`;
  }

  msg += `\n\nRegards,\n*Administration Office*\n${collegeName}`;
  return msg;
}

export async function sendAutoAdmissionNotice(
  admission: any,
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<boolean> {
  const phone =
    admission?.whatsappNumber ||
    admission?.fatherContact ||
    admission?.contact ||
    admission?.guardianPhone ||
    '';
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    if (!options?.silent) toast.error('Valid WhatsApp phone number not found.');
    return false;
  }

  try {
    const pdfRes = await fetch('/api/whatsapp/send-official-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admission_slip',
        phone: cleanPhone,
        admissionData: {
          studentName: admission?.fullName || 'Student',
          fatherName: admission?.fatherName || 'N/A',
          rollNo: admission?.collegeNo || admission?.studentId || admission?.rollNo || admission?.id || 'N/A',
          className: admission?.group || admission?.course || admission?.category || 'Intermediate',
          section: admission?.section || 'A',
          session: admission?.session || '2026-28',
          contact: cleanPhone,
          bForm: admission?.bayFormNo || admission?.bForm || 'N/A',
          totalPackage: Number(admission?.totalPackage || admission?.total_package || 0),
          paidAmount: Number(admission?.feeReceived || admission?.admissionFee || admission?.fee_received || 0),
          admissionDate: admission?.admissionDate || new Date().toISOString(),
        },
      }),
    });
    const pdfData = await pdfRes.json().catch(() => ({}));
    if (pdfRes.ok && pdfData?.success) {
      if (!options?.silent) {
        toast.success(`Official Admission Slip PDF sent to +${cleanPhone}`);
      }
      const hasPhoto = Boolean(admission?.photo || admission?.photoUrl || admission?.photo_url);
      if (!hasPhoto) {
        const name = admission?.fullName || 'Student';
        const rollNo = admission?.collegeNo || admission?.studentId || admission?.rollNo || admission?.id || 'N/A';
        const photoPrompt = `📸 *PROFILE PHOTO REQUIRED — SUPERIOR COLLEGE JAHANIAN*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nBaraye meherbani *${name}* (Roll No: *${rollNo}*) ki passport-size photo isi WhatsApp par reply karein taake Smart Gate Face Attendance aur Student ID Card active kiya ja sake.`;
        await dispatchWhatsAppMessage(cleanPhone, photoPrompt, { silent: true });
      }
      return true;
    }
  } catch (e) {
    console.warn('Admission PDF send fallback to text:', e);
  }

  const msg = buildAdmissionNoticeMessage(admission, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, options);
  return res.success;
}

export function parseAttendanceNotesAndTime(
  notes?: string,
  explicitCheckIn?: string,
  explicitCheckOut?: string
): {
  checkIn: string;
  breakOut: string;
  breakIn: string;
  checkOut: string;
  campusState: string;
  movements: Array<{ type: string; time: string }>;
  cleanRemarks: string;
} {
  let checkIn = explicitCheckIn || '';
  let breakOut = '';
  let breakIn = '';
  let checkOut = explicitCheckOut || '';
  let campusState = '';
  let movements: Array<{ type: string; time: string }> = [];
  let cleanRemarks = '';

  if (notes && typeof notes === 'string') {
    const trimmed = notes.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (!checkIn && (parsed.checkIn || parsed.check_in || parsed.time)) {
          checkIn = String(parsed.checkIn || parsed.check_in || parsed.time);
        }
        if (parsed.breakOut || parsed.break_out) {
          breakOut = String(parsed.breakOut || parsed.break_out);
        }
        if (parsed.breakIn || parsed.break_in) {
          breakIn = String(parsed.breakIn || parsed.break_in);
        }
        if (!checkOut && (parsed.checkOut || parsed.check_out)) {
          checkOut = String(parsed.checkOut || parsed.check_out);
        }
        if (parsed.campusState) {
          campusState = String(parsed.campusState);
        }
        if (Array.isArray(parsed.movements)) {
          movements = parsed.movements;
        }
        cleanRemarks = parsed.notes || parsed.Verify || parsed.method || 'Biometric Verified';
      } catch {
        cleanRemarks = 'Biometric Verified';
      }
    } else {
      const inMatch = trimmed.match(/check[-\s]*in[:\s]+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM)?)/i);
      const outMatch = trimmed.match(/check[-\s]*out[:\s]+([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM)?)/i);
      const timeMatch = trimmed.match(/\b([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?\s*(?:AM|PM))\b/i);
      if (!checkIn && inMatch) checkIn = inMatch[1].trim();
      else if (!checkIn && timeMatch) checkIn = timeMatch[1].trim();
      if (!checkOut && outMatch) checkOut = outMatch[1].trim();
      cleanRemarks = trimmed;
    }
  }

  return { checkIn, breakOut, breakIn, checkOut, campusState, movements, cleanRemarks };
}

export function buildDailyAttendanceMessage(
  student: any,
  attendance: {
    date: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
    monthlyAbsents?: number;
    monthlyLeaves?: number;
    monthlyPresents?: number;
    monthName?: string;
  },
  settings?: any
): string {
  const collegeName = 'Superior College Jahanian';
  const name = student?.fullName || student?.full_name || 'Student';
  const rollNo = student?.studentId || student?.collegeNo || student?.college_no || student?.id || 'N/A';
  const cls = student?.currentClass || student?.group || student?.groupName || 'Class';
  const status = attendance.status || 'Present';
  const statusIcon =
    status === 'Present'
      ? '✅ PRESENT (Hazir)'
      : status === 'Absent'
      ? '🚨 ABSENT (Ghair Hazir)'
      : status === 'Late'
      ? '⏰ LATE ARRIVAL'
      : '📋 ON LEAVE';

  const parsed = parseAttendanceNotesAndTime(
    attendance.notes,
    attendance.checkInTime || (attendance as any).check_in_time,
    attendance.checkOutTime || (attendance as any).check_out_time
  );
  const nowTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const markedTime =
    parsed.checkIn || (status === 'Present' || status === 'Late' ? nowTimeStr : nowTimeStr);

  let msg = `🏛️ *${collegeName.toUpperCase()}*\n📋 *DAILY ATTENDANCE ALERT*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 *Student:* *${name}*\n🆔 *Roll No:* *${rollNo}* (${cls})\n📅 *Date:* *${attendance.date}*\n⏰ *Marked Time:* *${markedTime}*${parsed.checkOut ? ` | *Check-Out:* *${parsed.checkOut}*` : ''}\n📌 *Status:* *${statusIcon}*`;

  if (parsed.cleanRemarks) {
    msg += `\n📝 *Verification:* ${parsed.cleanRemarks}`;
  }
  if (typeof attendance.monthlyAbsents === 'number') {
    msg += `\n\n📊 *${attendance.monthName || 'Monthly'} Summary:* Present: *${attendance.monthlyPresents ?? 0}* | Absent: *${attendance.monthlyAbsents}* | Leave: *${attendance.monthlyLeaves ?? 0}*`;
  }
  msg += `\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_Attendance Cell — ${collegeName}_`;
  return msg;
}

export async function sendAutoDailyAttendanceNoticeDetailed(
  student: any,
  attendance: {
    date: string;
    status: string;
    checkInTime?: string;
    checkOutTime?: string;
    notes?: string;
    monthlyAbsents?: number;
    monthlyLeaves?: number;
    monthlyPresents?: number;
    monthName?: string;
  },
  settings?: any,
  options?: { silent?: boolean; manualTrigger?: boolean }
): Promise<{ success: boolean; phone: string; error?: string }> {
  const phone =
    student?.fatherContact ||
    student?.father_contact ||
    student?.guardianPhone ||
    student?.whatsapp ||
    student?.contact ||
    student?.phone ||
    '';
  const msg = buildDailyAttendanceMessage(student, attendance, settings);
  return dispatchWhatsAppMessage(phone, msg, options);
}

export async function sendAutoDailyAttendanceNotice(
  student: any,
  attendance: { date: string; status: string; checkInTime?: string; checkOutTime?: string; notes?: string },
  settings?: any
): Promise<boolean> {
  const res = await sendAutoDailyAttendanceNoticeDetailed(student, attendance, settings, {
    manualTrigger: true,
  });
  return res.success;
}

export async function sendAutoStaffDailyCheckInNotice(
  staff: any,
  attendance: {
    date: string;
    status: string;
    checkInTime?: string;
    breakOutTime?: string;
    breakInTime?: string;
    checkOutTime?: string;
    punchEventLabel?: string;
    mode?: string;
    notes?: string;
  },
  options?: { silent?: boolean; alsoSendPdf?: boolean }
): Promise<boolean> {
  const phone = staff?.contact || staff?.phone || staff?.whatsapp || '';
  const cleanPhone = formatWhatsAppPhone(phone);
  if (!cleanPhone || cleanPhone.length < 10) return false;

  const parsed = parseAttendanceNotesAndTime(
    attendance.notes,
    attendance.checkInTime,
    attendance.checkOutTime
  );
  const nowTimeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const checkIn = parsed.checkIn || nowTimeStr;
  const breakOut = attendance.breakOutTime || parsed.breakOut || '';
  const breakIn = attendance.breakInTime || parsed.breakIn || '';
  const checkOut = parsed.checkOut || '';
  const staffName = staff?.fullName || staff?.full_name || 'Faculty Member';
  const role = staff?.designation || staff?.role || 'Faculty';
  const staffId = staff?.id || 'STF';

  if (options?.alsoSendPdf && staff?.id) {
    const pdfOk = await sendAutoStaffAttendancePdfNotice(staff.id, cleanPhone, attendance.date, {
      silent: options?.silent ?? true,
    });
    if (pdfOk) return true;
  }

  let timingBlock = `⏰ *Morning Check-In:* *${checkIn}*`;
  if (breakOut) {
    timingBlock += `\n☕ *Mid-Day Out (Break/Free Period):* *${breakOut}*`;
  }
  if (breakIn) {
    timingBlock += `\n🔄 *Returned to Campus (Break In):* *${breakIn}*`;
  }
  if (checkOut) {
    timingBlock += `\n🏁 *Final Duty Check-Out:* *${checkOut}*`;
  }

  const msg = `🏛️ *SUPERIOR COLLEGE JAHANIAN*\n✅ *STAFF ATTENDANCE & MOVEMENT LOG*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 *Faculty:* *${staffName}* (${role} • ID: *${staffId}*)\n📅 *Date:* *${attendance.date}*\n📌 *Status:* *${(attendance.punchEventLabel || attendance.status).toUpperCase()}*\n${timingBlock}\n🔐 *Mode:* ${attendance.mode || parsed.cleanRemarks || 'Biometric Verified'}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_HR & Attendance Desk — Superior College Jahanian_`;

  const res = await dispatchWhatsAppMessage(cleanPhone, msg, { silent: options?.silent ?? true });
  return res.success;
}

export function buildPeriodicAttendanceMessage(
  student: any,
  stats: {
    period: string;
    periodLabel: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
    holiday?: number;
    totalWorkingDays: number;
  },
  settings?: any
): string {
  const collegeName = 'Superior College Jahanian';
  const name = student?.fullName || 'Student';
  const rollNo = student?.studentId || student?.collegeNo || student?.id || 'N/A';
  const pct =
    stats.totalWorkingDays > 0
      ? Math.round(((stats.present + stats.late) / stats.totalWorkingDays) * 100)
      : 100;

  return `🏛️ *${collegeName.toUpperCase()}*\n📊 *MONTHLY ATTENDANCE REPORT (${stats.periodLabel})*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n👤 *Student:* *${name}*\n🆔 *Roll No:* *${rollNo}*\n\n• *Total Working Days:* ${stats.totalWorkingDays}\n• *Present:* *${stats.present}*\n• *Absent:* *${stats.absent}*\n• *Late:* *${stats.late}*\n• *Leave:* *${stats.leave}*\n• *Attendance Percentage:* *${pct}%*\n━━━━━━━━━━━━━━━━━━━━━━━━━\n_Academic Office — ${collegeName}_`;
}

export async function sendAutoPeriodicAttendanceReport(
  student: any,
  stats: {
    period: string;
    periodLabel: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
    holiday?: number;
    totalWorkingDays: number;
  },
  settings?: any
): Promise<boolean> {
  const phone =
    student?.fatherContact ||
    student?.guardianPhone ||
    student?.whatsapp ||
    student?.contact ||
    '';
  const msg = buildPeriodicAttendanceMessage(student, stats, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, { manualTrigger: true });
  return res.success;
}

export function buildPhotoUploadRequestMessage(student: any, settings?: any): string {
  const collegeName = 'Superior College Jahanian';
  const name = student?.fullName || 'Student';
  const rollNo = student?.studentId || student?.collegeNo || student?.id || 'N/A';
  return `🏛️ *${collegeName.toUpperCase()}*\n📸 *URGENT: STUDENT PHOTOGRAPH REQUIRED*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDear Parents / *${name}* (Roll No: *${rollNo}*),\nOur records indicate that your official passport photograph is missing in the College ERP.\n\n📸 *Easy Upload:* Simply reply to this WhatsApp message with a clear front-facing photo of *${name}* so our AI system can automatically attach it to your Smart Gate Attendance & ID Card profile.\n\n_IT & Records Cell — ${collegeName}_`;
}

export async function sendAutoPhotoUploadRequestNotice(
  student: any,
  settings?: any
): Promise<boolean> {
  const phone =
    student?.fatherContact ||
    student?.guardianPhone ||
    student?.whatsapp ||
    student?.contact ||
    '';
  const msg = buildPhotoUploadRequestMessage(student, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, { manualTrigger: true });
  return res.success;
}

export async function dispatchBulkPhotoRequests(
  students: any[],
  settings?: any,
  onProgress?: (sent: number, total: number) => void
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < students.length; i++) {
    const ok = await sendAutoPhotoUploadRequestNotice(students[i], settings);
    if (ok) sent++;
    else failed++;
    onProgress?.(i + 1, students.length);
  }
  return { sent, failed };
}

export function buildFeeReminderMessage(student: any, balance: number, settings?: any): string {
  const collegeName = 'Superior College Jahanian';
  const name = student?.fullName || 'Student';
  const rollNo = student?.collegeNo || student?.studentId || student?.id || 'N/A';
  const dueAmt = Number(balance ?? student?.balance ?? 0);
  return `🏛️ *${collegeName.toUpperCase()}*\n💳 *FEE INSTALLMENT REMINDER*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDear Parents / *${name}* (Roll No: *${rollNo}*),\nThis is a gentle reminder that your pending fee balance is *Rs. ${dueAmt.toLocaleString()}*.\n\nKindly clear your dues at the College Accounts Office at your earliest convenience. Ignore if already paid.\n\n_Accounts Department — ${collegeName}_`;
}

export async function sendAutoFeeReceiptNotice(
  student: any,
  payment: {
    receiptId: string;
    amountPaid: number;
    datePaid?: string;
    feeType?: string;
    remainingBalance: number;
    collectedBy?: string;
    paymentMode?: string;
  },
  settings?: any
): Promise<boolean> {
  const collegeName = 'Superior College Jahanian';
  const name = student?.fullName || 'Student';
  const rollNo = student?.collegeNo || student?.studentId || student?.id || 'N/A';
  const phone =
    student?.fatherContact ||
    student?.guardianPhone ||
    student?.whatsappNumber ||
    student?.contact ||
    '';
  const cleanPhone = formatWhatsAppPhone(phone);

  if (cleanPhone && cleanPhone.length >= 10) {
    try {
      const totalPkg = Number(student?.totalPackage || student?.total_package || 0);
      const remBal = Number(payment.remainingBalance || 0);
      const totalPaidSoFar = totalPkg > 0 ? Math.max(Number(payment.amountPaid || 0), totalPkg - remBal) : Number(student?.feeReceived || student?.fee_received || payment.amountPaid || 0);

      const pdfRes = await fetch('/api/whatsapp/send-official-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'fee_receipt_statement',
          phone: cleanPhone,
          studentId: student?.id || rollNo,
          paymentData: {
            studentId: student?.id || rollNo,
            studentName: name,
            fatherName: student?.fatherName || student?.father_name || 'N/A',
            rollNo,
            className: student?.group || student?.currentClass || 'Intermediate',
            section: student?.section || 'A',
            session: student?.session || '2026-28',
            receiptNo: payment.receiptId,
            paidAmount: Number(payment.amountPaid || 0),
            paymentDate: payment.datePaid || new Date().toISOString(),
            paymentMode: payment.paymentMode || 'Cash Counter',
            feeMonth: payment.feeType || 'Tuition Fee Installment',
            totalPackage: totalPkg,
            totalPaidSoFar,
            remainingBalance: remBal,
          },
        }),
      });
      const pdfData = await pdfRes.json().catch(() => ({}));
      if (pdfRes.ok && pdfData?.success) {
        return true;
      }
    } catch (e) {
      console.warn('Fee Receipt & Statement PDF fallback to text:', e);
    }
  }

  const receiptUrl = getDocumentLink('receipt', payment.receiptId, { roll: rollNo }, settings);
  const msg = `🏛️ *${collegeName.toUpperCase()}*\n🧾 *OFFICIAL FEE RECEIPT CONFIRMATION*\n━━━━━━━━━━━━━━━━━━━━━━━━━\nDear Parents / *${name}* (Roll No: *${rollNo}*),\nWe have received your fee payment with thanks.\n\n• *Receipt No:* *${payment.receiptId}*\n• *Amount Paid:* *Rs. ${Number(payment.amountPaid || 0).toLocaleString()}*\n• *Fee Head:* ${payment.feeType || 'Tuition Fee'}\n• *Date:* ${payment.datePaid || new Date().toISOString().split('T')[0]}\n• *Remaining Balance:* *Rs. ${Number(payment.remainingBalance || 0).toLocaleString()}*\n\n*Digital Receipt:* ${receiptUrl}\n\n_Accounts Office — ${collegeName}_`;

  const res = await dispatchWhatsAppMessage(phone, msg, { silent: true });
  return res.success;
}

export async function sendAutoStaffAttendancePdfNotice(
  staffId: string,
  phone?: string,
  monthStr?: string,
  options?: { silent?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch('/api/whatsapp/send-official-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff_attendance',
        staffId,
        phone: phone ? formatWhatsAppPhone(phone) : undefined,
        monthStr,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      if (!options?.silent) {
        toast.success(`Cumulative Attendance PDF sent (${data.fileName || 'PDF'})`);
      }
      return true;
    }
    if (!options?.silent && data?.error) {
      toast.error(data.error);
    }
    return false;
  } catch (err: any) {
    if (!options?.silent) {
      toast.error(err?.message || 'Failed to send Staff Attendance PDF');
    }
    return false;
  }
}

export async function sendAutoStaffSalaryPdfNotice(
  staffId: string,
  phone?: string,
  monthStr?: string,
  options?: { silent?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch('/api/whatsapp/send-official-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff_salary',
        staffId,
        phone: phone ? formatWhatsAppPhone(phone) : undefined,
        monthStr,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      if (!options?.silent) {
        toast.success(`Official Salary Slip PDF sent (${data.fileName || 'PDF'})`);
      }
      return true;
    }
    if (!options?.silent && data?.error) {
      toast.error(data.error);
    }
    return false;
  } catch (err: any) {
    if (!options?.silent) {
      toast.error(err?.message || 'Failed to send Staff Salary PDF');
    }
    return false;
  }
}

export function buildLeadFollowUpMessage(lead: any, settings?: any): string {
  const collegeName = settings?.collegeName || 'Superior College Jahanian';
  const name = lead?.studentName || lead?.fullName || 'Student';
  const course = lead?.interestedCourse || lead?.group || 'F.Sc / ICS / BS Programs';
  return `*${collegeName.toUpperCase()}*\n*ADMISSIONS SESSION 2026-28*\n\nAssalam-o-Alaikum *${name}*,\nThank you for visiting ${collegeName} regarding admission in *${course}*.\n\nMerit scholarships and early-bird seat reservations are currently open. Visit our Admission Desk or reply to this message for complete fee & scholarship guidance.\n\nRegards,\n*Admission Counseling Cell - ${collegeName}*`;
}

export async function sendAutoLeadFollowUpNotice(lead: any, settings?: any): Promise<boolean> {
  const phone = lead?.contactNumber || lead?.whatsappNumber || lead?.fatherContact || lead?.phone || '';
  const msg = buildLeadFollowUpMessage(lead, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, { manualTrigger: true });
  return res.success;
}

export function buildStaffPhotoRequestMessage(staff: any, settings?: any): string {
  const collegeName = settings?.collegeName || 'Superior College Jahanian';
  const name = staff?.fullName || 'Faculty Member';
  return `*${collegeName.toUpperCase()}*\n*FACULTY PROFILE PHOTOGRAPH REQUEST*\n\nRespected *${name}*,\nKindly reply to this message with your formal passport-size photograph so we can update your Executive Faculty ID Card and ERP Dossier.\n\nRegards,\n*HR & Administration - ${collegeName}*`;
}

export async function sendStaffPhotoRequestNotice(staff: any, settings?: any): Promise<boolean> {
  const phone = staff?.contact || staff?.phone || staff?.whatsapp || '';
  const msg = buildStaffPhotoRequestMessage(staff, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, { manualTrigger: true });
  return res.success;
}

export async function dispatchBulkStaffPhotoRequests(
  staffList: any[],
  settings?: any
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const s of staffList) {
    const ok = await sendStaffPhotoRequestNotice(s, settings);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}

export async function sendStaffEnrollmentNotice(staff: any, settings?: any): Promise<boolean> {
  const collegeName = settings?.collegeName || 'Superior College Jahanian';
  const name = staff?.fullName || 'Faculty Member';
  const role = staff?.role || staff?.designation || 'Faculty';
  const phone = staff?.contact || staff?.phone || '';
  const msg = `*${collegeName.toUpperCase()}*\n*WELCOME TO SUPERIOR FACULTY*\n\nRespected *${name}*,\nWelcome aboard as *${role}* at ${collegeName}. Your faculty profile and payroll ledger have been initialized in the SCJ ERP.\n\nRegards,\n*Principal & Administration - ${collegeName}*`;
  const res = await dispatchWhatsAppMessage(phone, msg, { silent: true });
  return res.success;
}

export function buildStudentNoticeMessage(
  student: any,
  notice: { title?: string; content?: string },
  settings?: any
): string {
  const collegeName = settings?.collegeName || 'Superior College Jahanian';
  const name = student?.fullName || 'Student';
  const rollNo = student?.collegeNo || student?.studentId || student?.id || 'N/A';
  const title = notice?.title || 'OFFICIAL CAMPUS NOTICE';
  const body =
    notice?.content ||
    'Please stay updated with your academic schedule and maintain regular attendance.';
  return `*${collegeName.toUpperCase()}*\n*${title.toUpperCase()}*\n\nDear Parents / *${name}* (Roll No: *${rollNo}*),\n${body}\n\nRegards,\n*Administration - ${collegeName}*`;
}

export async function sendAutoStudentNotice(
  student: any,
  notice: { title?: string; content?: string },
  settings?: any
): Promise<boolean> {
  const phone =
    student?.fatherContact ||
    student?.guardianPhone ||
    student?.whatsapp ||
    student?.contact ||
    '';
  const msg = buildStudentNoticeMessage(student, notice, settings);
  const res = await dispatchWhatsAppMessage(phone, msg, { manualTrigger: true });
  return res.success;
}
