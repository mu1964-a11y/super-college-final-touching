import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateBotUserManualPDF(metadata?: {
  campusName?: string;
  principalName?: string;
  contactNumber?: string;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryTeal = [8, 90, 78] as [number, number, number]; // #085a4e
  const goldAccent = [207, 168, 76] as [number, number, number]; // #cfa84c
  const darkSlate = [30, 41, 59] as [number, number, number]; // #1e293b
  const lightBg = [248, 250, 252] as [number, number, number];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const campus = metadata?.campusName || "Superior Group of Colleges — Jahanian Campus";

  // Helper for Header
  const addHeader = (title: string, subtitle: string) => {
    doc.setFillColor(...primaryTeal);
    doc.rect(0, 0, pageWidth, 28, "F");

    // Gold decorative stripe
    doc.setFillColor(...goldAccent);
    doc.rect(0, 28, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(campus.toUpperCase(), pageWidth / 2, 11, { align: "center" });

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(230, 245, 240);
    doc.text(title.toUpperCase(), pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...goldAccent);
    doc.text(subtitle, pageWidth / 2, 24.5, { align: "center" });
  };

  // Helper for Footer
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(...primaryTeal);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Superior College Jahanian • Official AI Executive Operations & Technical Directive", 14, pageHeight - 5);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: "right" });
  };

  // ══════════════════════════════════════════════════════
  // PAGE 1: AI MODELS SPECIFICATION & ARCHITECTURE
  // ══════════════════════════════════════════════════════
  addHeader(
    "AI Executive Assistant & WhatsApp Bot Operations Manual",
    "Architecture: Google Gemini 2.5 Flash (Audio/STT) & Gemini 2.5 Flash Vision (Multimodal OCR & Face ID)"
  );

  let y = 36;

  // Document Metadata Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "FD");

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("OFFICIAL TECHNICAL SPECIFICATION & OPERATIONAL DIRECTIVE", 18, y + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  doc.text("Document Ref: SGC-AI-OPS-2026-V3", 18, y + 13);
  doc.text("Core AI Engine: Google Gemini 2.5 Flash (Audio STT + Vision OCR)", 18, y + 18.5);
  doc.text("Multi-Device Gateway: Baileys WS Bridge (Port 5000)", 18, y + 24);
  doc.text(`Effective Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - 72, y + 13);
  doc.text("Normalized Session: 2026-28", pageWidth - 72, y + 18.5);
  doc.text("Security Standard: Multi-Factor Zero-Trust", pageWidth - 72, y + 24);

  y += 32;

  // Executive Overview Section
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. AI Models Infrastructure & Core Engine Stack", 14, y);

  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  const overviewText = 
    "The Superior College Jahanian Autonomous WhatsApp AI Executive Agent is powered by an enterprise dual-engine stack built directly on Google Gemini 2.5 Flash. It operates 24/7 as an intelligent institutional coworker across voice, visual documents, and database operations. The platform eliminates manual administrative overhead by processing spoken voice notes in Urdu, Roman Urdu, and English, scanning handwritten admission slips, automating parent absent alerts, and executing verified fee deposits.";
  
  const splitOverview = doc.splitTextToSize(overviewText, pageWidth - 28);
  doc.text(splitOverview, 14, y);
  y += splitOverview.length * 4.2 + 3;

  // AI Models Breakdown Table
  autoTable(doc, {
    startY: y,
    head: [["AI Subsystem", "Model / Protocol", "Exact Operational Function in College LMS"]],
    body: [
      [
        "Voice Understanding (STT)",
        "Google Gemini 2.5 Flash Audio API",
        "Native multimodal comprehension of incoming voice notes (.ogg, .mp4, .m4a) in Roman Urdu, Spoken Urdu, and English. No third-party transcription required."
      ],
      [
        "Document & Slip OCR",
        "Google Gemini 2.5 Flash Vision API",
        "Deep computer vision extraction of handwritten paper admission slips, matric marks, Bay-Form/CNIC numbers, and fee receipts directly from camera photos."
      ],
      [
        "Biometric Face Engine",
        "Gemini Vision Landmark Biometrics",
        "High-security face comparison across facial geometry (eye spacing, nose bridge, jaw structure). Compares live selfie against enrolled anchor (>=65% match)."
      ],
      [
        "Audio Fallback Protocol",
        "OpenAI Whisper STT Dual-Stack",
        "Secondary transcription failover ensuring zero interruption if primary voice channels experience packet degradation or latency."
      ],
      [
        "WhatsApp Bridge",
        "Baileys Multi-Device Socket",
        "Persistent WebSocket connection supporting two-way real-time messaging, end-to-end media buffering, and dynamic QR authentication."
      ],
      [
        "Database Layer",
        "Supabase PostgreSQL + RLS",
        "Real-time synchronized storage across students, admissions, fee ledgers, staff directory, biometric anchors, and audit logs."
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Attendance Module Highlights
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("2. Attendance Module & Automated Parent Notification Engine", 14, y);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...darkSlate);
  const attText = 
    "• Daily Absent Alerts to Parents: As soon as teacher marks attendance in LMS, the bot automatically sends personalized WhatsApp messages to parents/guardians: 'Assalam o Alaikum! Apka beta [Name] (Roll: [ID]) aaj [Date] ko college se ghair hazir raha hai. Is mahine ki total chuttiyan: [N]'.\n" +
    "• Voice Attendance Inquiries: Principal or faculty can send voice note: 'Aaj kitne students absent hain?' or 'Biology class ki attendance summary do'. Bot instantly calculates and replies with exact numbers.\n" +
    "• Faculty Punctuality & Leave Ledger: Tracks staff check-in times and monthly absent deductions for automatic payroll processing.";

  const splitAtt = doc.splitTextToSize(attText, pageWidth - 28);
  doc.text(splitAtt, 14, y);

  addFooter(1, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 2: ADMISSIONS, FEES & ACADEMIC WORKFLOWS
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Operational Workflows: Admissions, Fees & Academic Exams", "Gemini Vision Paper OCR, Instant Fee Ledger & Result Cards");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Paper / Handwritten Admission Form OCR (Gemini Vision)", 14, y);

  y += 4.5;
  const admText = 
    "Staff members no longer need to type lengthy admission records on a computer. An admission can be completed in under 30 seconds straight from WhatsApp using Gemini 2.5 Flash Vision:";
  const splitAdm = doc.splitTextToSize(admText, pageWidth - 28);
  doc.text(splitAdm, 14, y);
  y += splitAdm.length * 4.2 + 3;

  autoTable(doc, {
    startY: y,
    head: [["Step", "Action Taken", "AI Model / Bot Process", "Database & LMS Outcome"]],
    body: [
      [
        "1. Photo Capture",
        "Staff member snaps a clear photo of handwritten admission form / slip and sends to WhatsApp Bot.",
        "Image buffered in memory; bot replies: '⏳ Scanning Admission Document via Gemini Vision...'",
        "Temporary secure memory allocation."
      ],
      [
        "2. Gemini Vision OCR",
        "Gemini 2.5 Flash Vision parses document fields automatically.",
        "Extracts Full Name, Father Name, Contact, CNIC/B-Form, Previous Marks, Program, Section, Total Fee Package.",
        "Staged in pendingAdmissions cache with normalized Session 2026-28."
      ],
      [
        "3. Verification Prompt",
        "Bot presents structured summary to staff: 'Student: Ahmad Khan, Group: FSC Pre-Med, Fee: Rs. 65,000'.",
        "Prompts staff for authorization: 'Confirm karne ke liye likhein: CONFIRM [5-digit-pin]'.",
        "Guards against unauthorized mutations."
      ],
      [
        "4. PIN Confirmation",
        "Staff enters 5-digit PIN (e.g. 'CONFIRM 48291').",
        "Cryptographic SHA-256 validation against delegated admin record.",
        "Unique Student ID generated (e.g. SGC-26-842); written to admissions & students tables."
      ],
      [
        "5. Notifications",
        "Instant confirmation message sent to staff.",
        "Bot dispatches automated WhatsApp alert to Principal: '📝 New Admission Enrolled via Bot'.",
        "Student immediately appears in Fee Management, ID Cards, and Class Registers."
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // Section 4: Fee Collection Recording
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Instant Fee Collection & Automatic Receipt Delivery", 14, y);

  y += 4.5;
  const feeDesc = 
    "Authorized staff can record fee deposits on-the-spot via spoken voice note or short text command. The bot validates the operator's 5-digit PIN, updates the accounts ledger, and instantly delivers an official fee deposit slip to the parent's WhatsApp.";
  const splitFeeDesc = doc.splitTextToSize(feeDesc, pageWidth - 28);
  doc.text(splitFeeDesc, 14, y);
  y += splitFeeDesc.length * 4.2 + 3;

  autoTable(doc, {
    startY: y,
    head: [["Mode", "Spoken / Typed Input Example", "Verification", "Instant Output Delivered"]],
    body: [
      [
        "Voice Note",
        "🎤 'Ahmad Raza roll 102 ki 15,000 fee jama ho gayi hai receipt 402 PIN 12345'",
        "Gemini 2.5 STT parses speech -> Validates 5-Digit PIN",
        "Updates fee_received in DB; dispatches official branded Fee Receipt to student/father WhatsApp."
      ],
      [
        "Text Command",
        "💬 'Fee received Rs 15000 for roll 102 receipt 402 PIN 12345'",
        "Regex/NLP entity extraction -> Validates 5-Digit PIN",
        "Updates fee_received in DB; sends fee receipt to parent; alerts Principal WhatsApp."
      ],
      [
        "Balance Check",
        "🎤 'Mera roll number 102 hai meri baqaya fees kitni hai?'",
        "Student Phone/Roll cross-check",
        "Outputs Total Package, Paid Amount, and Remaining Balance with due date."
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  addFooter(2, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 3: STAFF DELEGATION & BIOMETRIC SECURITY
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Zero-Trust Security, Staff Delegation & Face Biometrics", "OTP Handshake, 5-Digit Operational PINs & Gemini Face Verification");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("5. Multi-Factor Staff Delegation Protocol", 14, y);

  y += 4.5;
  const delText = 
    "To prevent administrative breaches and unauthorized data entry, staff members can ONLY execute operations if explicitly delegated by the Principal through the WhatsApp AI Center. The security lifecycle consists of 5 mandatory steps:";
  const splitDel = doc.splitTextToSize(delText, pageWidth - 28);
  doc.text(splitDel, 14, y);
  y += splitDel.length * 4.2 + 3;

  autoTable(doc, {
    startY: y,
    head: [["Security Stage", "Initiator", "Protocol / WhatsApp Interaction", "Security Guarantee"]],
    body: [
      [
        "1. Rights Delegation",
        "Principal",
        "Assigns staff member & specific rights (Admissions, Fee Collection, Attendance) in Web App or via WhatsApp: 'delegate [Name] [Permissions] phone [Number]'.",
        "Only Principal's registered WhatsApp phone can authorize new staff."
      ],
      [
        "2. 6-Digit OTP Handshake",
        "Bot -> Staff",
        "Bot verifies staff record in database and dispatches a 6-digit OTP to staff's WhatsApp: 'VERIFY [OTP]'.",
        "Verifies physical possession of the registered SIM card (valid 60 mins)."
      ],
      [
        "3. Password & PIN Setup",
        "Staff -> Bot",
        "Staff replies: 'SETUP [8+ Char Password] PIN [5-digit PIN]' (e.g. 'SETUP Superior@2026 PIN 48291').",
        "Stored using irreversible SHA-256 cryptographic hashing. Only last 4 digits displayed."
      ],
      [
        "4. Biometric Selfie Enrollment",
        "Staff -> Bot",
        "Staff snaps a direct phone camera selfie and sends to bot. Stored in DB as gold biometric anchor.",
        "Provides permanent visual identity reference for future high-risk verification."
      ],
      [
        "5. Principal Return Alert",
        "Bot -> Principal",
        "Bot automatically notifies Principal: '🔐 STAFF VERIFICATION ALERT: [Name] ([Phone]) has verified credentials. Account ACTIVE.'",
        "Principal has complete real-time visibility over staff onboarding."
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // Section 6: Biometric Face Verification in Doubted Cases
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("6. Biometric Face Verification in Doubted Cases", 14, y);

  y += 4.5;
  const bioText = 
    "When an admin enters an incorrect PIN 2 times, attempts actions from an unrecognized session, or when the Principal clicks 'Force Face Re-Auth' in the Web Console, the bot halts execution and demands a live camera selfie.\n\n" +
    "Gemini 2.5 Flash Vision evaluates facial geometry between the live selfie and the database enrolled photo. Facial similarity must meet or exceed 65%. If verification fails, the account is locked and an emergency breach warning is sent to the Principal.";
  const splitBio = doc.splitTextToSize(bioText, pageWidth - 28);
  doc.text(splitBio, 14, y);

  addFooter(3, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 4: COMMAND REFERENCE & AUDIT MATRIX
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Universal Commands Quick Reference & Audit Standards", "Multi-Role Cheat Sheet for Students, Parents, Faculty, Admins & Principal");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("7. Universal Voice & Text Commands Cheat Sheet", 14, y);

  y += 4.5;

  autoTable(doc, {
    startY: y,
    head: [["Stakeholder", "Example Voice Note or Message", "Bot Execution & Output"]],
    body: [
      [
        "Students / Parents",
        "🎤 'Mera roll number 204 hai meri fees ka status batao'",
        "Verifies student record; outputs Total Package, Paid Fees, and Remaining Dues."
      ],
      [
        "Students / Parents",
        "🎤 'Ahmad Raza s/o Muhammad Akram ka result dikhao'",
        "Fuzzy matches name + father name; formats and delivers full marksheet table."
      ],
      [
        "Students / Parents",
        "💬 'Meri is mahine kitni chuttiyan hain?'",
        "Calculates present/absent days from daily attendance logs."
      ],
      [
        "Faculty / Teachers",
        "🎤 'Mera aaj ka timetable kya hai?' / 'Monday periods'",
        "Fetches scheduled lectures, class sections, and room numbers from timetable."
      ],
      [
        "Faculty / Teachers",
        "💬 'Meri attendance aur advance salary kitni baqi hai?'",
        "Outputs monthly attendance count and remaining unrecovered advance salary."
      ],
      [
        "Delegated Admin",
        "📸 [Camera photo of paper admission slip]",
        "Gemini Vision extracts candidate details; prompts for 5-digit PIN."
      ],
      [
        "Delegated Admin",
        "💬 'CONFIRM 48291'",
        "Enrolls candidate into LMS database with unique College ID (Session 2026-28)."
      ],
      [
        "Delegated Admin",
        "🎤 'Roll 102 fee 15000 jama receipt 402 PIN 12345'",
        "Records fee payment; auto-delivers official deposit receipt to parent."
      ],
      [
        "Principal",
        "🎤 'Aaj ka institutional briefing report do'",
        "Delivers live summary: Total Admissions, Daily Cash Collection, Staff Punctuality."
      ],
      [
        "Principal",
        "💬 'delegate Bashir permissions fees phone 03014455891'",
        "Initiates staff delegation handshake and dispatches 6-digit WhatsApp OTP."
      ],
      [
        "Principal",
        "💬 'show delegated staff'",
        "Lists all authorized staff members, assigned roles, PIN status, and biometric state."
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Section 8: Technical Support & Directives
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("8. Institutional Compliance & Audit Trail Standard", 14, y);

  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...darkSlate);
  const compText = 
    "Every incoming voice note transcript, document image, PIN verification, and biometric challenge is permanently logged in the college audit trail (`bot_audit_logs`). The Principal can inspect any historical transaction with full audio transcript, image preview, operator timestamp, and security level from the WhatsApp Center Executive Console.\n\n" +
    "For technical assistance, gateway reconnection, or emergency staff revocation, contact the Directorate of Information Technology or access Settings > Sub-Admins in the Superior College Jahanian LMS.";
  const splitComp = doc.splitTextToSize(compText, pageWidth - 28);
  doc.text(splitComp, 14, y);

  addFooter(4, 4);

  // Save the PDF
  doc.save("Superior_College_WhatsApp_AI_Operations_Manual.pdf");
}
