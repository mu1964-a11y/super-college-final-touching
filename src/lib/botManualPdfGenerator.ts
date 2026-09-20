import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generateBotUserManualPDF() {
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

  // Helper for Header
  const addHeader = (title: string, subtitle: string) => {
    doc.setFillColor(...primaryTeal);
    doc.rect(0, 0, pageWidth, 28, "F");

    // Gold decorative stripe
    doc.setFillColor(...goldAccent);
    doc.rect(0, 28, pageWidth, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SUPERIOR GROUP OF COLLEGES — JAHANIAN CAMPUS", pageWidth / 2, 12, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(230, 245, 240);
    doc.text(title.toUpperCase(), pageWidth / 2, 19, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(...goldAccent);
    doc.text(subtitle, pageWidth / 2, 25, { align: "center" });
  };

  // Helper for Footer
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFillColor(...primaryTeal);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Superior College Jahanian • Official AI Executive Operations Manual", 14, pageHeight - 5);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 5, { align: "right" });
  };

  // ══════════════════════════════════════════════════════
  // PAGE 1: COVER & EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════
  addHeader(
    "AI Executive Assistant & WhatsApp Bot Operations Manual",
    "Comprehensive Security, Multi-Role Voice, Biometrics & Delegation Protocol"
  );

  let y = 38;

  // Document Metadata Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "FD");

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("OFFICIAL EXECUTIVE DIRECTIVE & TECHNICAL SPECIFICATION", 18, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkSlate);
  doc.text("Document Ref: SGC-AI-OPS-2026-V2", 18, y + 14);
  doc.text("Audience: Principal, Directors, Delegated Staff & Faculty", 18, y + 20);
  doc.text(`Effective Date: ${new Date().toLocaleDateString("en-GB")}`, pageWidth - 70, y + 14);
  doc.text("System Version: LMS AI Nexus 2.5", pageWidth - 70, y + 20);

  y += 32;

  // Executive Overview Section
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("1. Executive Overview & System Architecture", 14, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...darkSlate);
  const overviewText = 
    "The Superior College Jahanian Autonomous WhatsApp AI Executive Agent is a state-of-the-art multimodal assistant designed to provide 24/7 intelligent institutional operations. Operating through official college WhatsApp channels with Gemini 2.5 Flash, the bot understands natural voice notes and text in Urdu, Roman Urdu, and English across all campus stakeholders (Students, Parents, Teachers, Admin Staff, and Principal).\n\n" +
    "To ensure zero unauthorized operations, the system implements an air-tight, multi-factor security framework: Principal-controlled staff delegation, DB-matched Phone OTPs, 8+ character passwords, 5-digit operational approval PINs, and Biometric Face Verification powered by AI Vision.";
  
  const splitOverview = doc.splitTextToSize(overviewText, pageWidth - 28);
  doc.text(splitOverview, 14, y);

  y += splitOverview.length * 4.5 + 4;

  // Key Pillars Table
  autoTable(doc, {
    startY: y,
    head: [["Pillar", "Core Technology", "Operational Capability"]],
    body: [
      ["Multi-Role Voice Recognition", "Gemini 2.5 Flash Audio API", "Native comprehension of Urdu / Roman Urdu voice notes for all campus users."],
      ["Principal Delegation", "Role-Based Access Control", "Principal delegates specific rights (Admissions, Fees, Attendance, Timetables)."],
      ["Biometric Face Enrollment", "Gemini Vision Biometrics", "Enrolls camera selfie in DB as anchor for high-risk identity validation."],
      ["5-Digit Operational PIN", "SHA-256 Hash Verification", "Day-to-day transaction approvals for new admissions & fee collection."],
      ["Paper Document OCR", "Gemini 2.5 Multimodal Vision", "Converts photos of handwritten admission slips directly into LMS student records."],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Stakeholder Voice Capabilities
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("2. Multi-Role Voice Note Understanding Matrix", 14, y);

  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Stakeholder Role", "Permitted Voice Inquiries", "Security & Verification Rule"]],
    body: [
      ["Students & Parents", "Fee dues balance, test marks, monthly attendance, admission queries for 2026-28.", "Name + Father Name or Roll Number check; private info protected."],
      ["Teachers & Faculty", "Daily / weekly lecture timetable, personal attendance, salary advance balance.", "Phone matched against DB staff record or verified via staff PIN."],
      ["Delegated Staff", "Handwritten admission submissions, fee collection recording, absent alerts.", "5-Digit PIN required for each financial or student database mutation."],
      ["Principal / Director", "Daily cash collection, fee defaulters, staff attendance briefing, instant delegation.", "Principal registered WhatsApp phone; unrestricted master authority."],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  addFooter(1, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 2: PRINCIPAL DELEGATION & ONBOARDING PROTOCOL
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Staff Delegation & Multi-Factor Security Protocol", "Zero-Trust Staff Enrollment, OTPs, PINs & Face Biometrics");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Step-by-Step Staff Delegation Workflow", 14, y);

  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Step", "Responsible Party", "Action & Communication", "Verification Mechanism"]],
    body: [
      ["1. Initiate Delegation", "Principal", "Selects staff member in Web App or sends WhatsApp command: 'delegate [Name] [Permissions] phone [Number]'.", "Principal executive phone validation."],
      ["2. DB Record Check", "System Bot", "Matches Name, Phone, and CNIC against LMS Staff directory records.", "Database record cross-matching."],
      ["3. OTP Dispatch", "System Bot", "Sends 6-digit one-time code to staff member's registered WhatsApp: 'VERIFY [OTP]'.", "Time-limited OTP (valid for 60 mins)."],
      ["4. Credentials Setup", "Staff Member", "Replies with OTP, then sets 8+ char password and 5-digit PIN: 'SETUP [Password] PIN [12345]'.", "SHA-256 cryptographic hashing."],
      ["5. Biometric Face Snap", "Staff Member", "Takes camera selfie and sends to bot. Image is stored in DB as biometric reference.", "AI facial geometry anchor creation."],
      ["6. Final Activation", "Principal & Bot", "Principal receives confirmation alert. Staff account status changes to ACTIVE.", "Instant executive notification."],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 4: Security Verification in Doubted Cases
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Biometric Face Verification (Doubted Cases & Security Challenges)", 14, y);

  y += 5;
  const doubtedText = 
    "When an admin attempts high-risk actions (such as high-value fee adjustments, session re-authentications, PIN failures, or when the Principal activates 'Force Face Re-Auth' from the Web Console), the bot halts operations and requests an immediate live camera selfie.\n\n" +
    "The Gemini Vision Biometric Engine compares the live selfie against the database reference snapshot across key facial landmarks (eye spacing, nose ridge, jaw structure). Only if facial confidence exceeds 65% is the operation permitted. If rejected, the account is immediately locked and the Principal receives an urgent alert.";

  const splitDoubted = doc.splitTextToSize(doubtedText, pageWidth - 28);
  doc.text(splitDoubted, 14, y);

  y += splitDoubted.length * 4.5 + 6;

  // Security Challenge Table
  autoTable(doc, {
    startY: y,
    head: [["Trigger Condition", "Security Challenge", "Threshold / Action", "Failure Consequence"]],
    body: [
      ["Routine Transactions (Admissions / Fees)", "5-Digit Operational PIN", "Exact SHA-256 hash match", "Operation rejected; 3 strikes trigger Face Lock."],
      ["Failed PIN (2+ Attempts)", "Biometric Live Selfie", "Face similarity >= 65%", "Account suspended; Principal alerted."],
      ["Principal 'Force Face Re-Auth'", "Biometric Live Selfie", "Face similarity >= 65%", "Blocked until Principal unlocks."],
      ["Unrecognized Device / New SIM", "OTP + Biometric Live Selfie", "OTP match + Face match", "Immediate lockout and breach warning."],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  addFooter(2, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 3: OPERATIONAL WORKFLOWS (ADMISSIONS & FEES)
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Operational Workflows: Paper Admissions & Fees", "AI Vision Document Parsing & Instant Financial Recording");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("5. Paper / Handwritten Admission Form OCR Workflow", 14, y);

  y += 5;
  const ocrText = 
    "Authorized staff members can register student admissions in under 30 seconds by simply photographing paper forms or handwritten slips and sending them to the WhatsApp Bot. The entire process follows strict confirmation rules:";

  const splitOcr = doc.splitTextToSize(ocrText, pageWidth - 28);
  doc.text(splitOcr, 14, y);
  y += splitOcr.length * 4.5 + 4;

  autoTable(doc, {
    startY: y,
    head: [["Stage", "Action Required", "System Output", "Database Effect"]],
    body: [
      ["1. Capture Photo", "Admin snaps a well-lit photo of the admission form / handwritten slip and sends via WhatsApp.", "Bot acknowledges receipt: '⏳ Scanning Admission Document...'", "Image buffered in secure temporary memory."],
      ["2. AI Vision OCR", "Gemini 2.5 Flash extracts Name, Father Name, Phone, CNIC, Matric Marks, Program, Section, and Fee.", "Structured preview sent to admin with fee breakdown and student details.", "Admission staged in pendingAdmissions cache."],
      ["3. PIN Confirmation", "Admin reviews preview and replies: 'CONFIRM [5-digit-pin]' (e.g. 'CONFIRM 12345').", "Bot validates PIN hash against delegated admin credentials.", "Validates operator authority."],
      ["4. Live Database Write", "Bot generates Unique Student ID (e.g. SGC-26-419) and inserts into admissions & students tables.", "Confirmation delivered to Admin with ID; Principal alerted via WhatsApp.", "Instant appearance in LMS ID Cards & Registers."],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 6: Fee Collection Recording
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("6. Fee Collection Recording via WhatsApp (Voice or Text)", 14, y);

  y += 5;
  const feeText = 
    "Staff with 'fee_collection' permission can record student fee payments on-the-fly via voice notes or text. The bot updates the student's ledger, adjusts remaining dues, and automatically sends an official deposit slip receipt to the student/parent.";

  const splitFee = doc.splitTextToSize(feeText, pageWidth - 28);
  doc.text(splitFee, 14, y);
  y += splitFee.length * 4.5 + 4;

  autoTable(doc, {
    startY: y,
    head: [["Method", "Example Voice / Text Command", "Bot Verification", "Automatic Output"]],
    body: [
      ["Voice Note", "🎤 'Ahmad Raza roll number 102 ki 15,000 fee jama ho gayi hai receipt 402 PIN 12345'", "Transcribes voice -> Extracts Roll, Amount, Receipt -> Validates 5-Digit PIN", "Updates fee_received in DB; sends WhatsApp receipt to Father."],
      ["Text Command", "💬 'Fee received Rs 15000 for roll 102 receipt 402 PIN 12345'", "Parses text -> Matches student -> Validates 5-Digit PIN", "Updates fee_received in DB; sends WhatsApp receipt to Father."],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  addFooter(3, 4);

  // ══════════════════════════════════════════════════════
  // PAGE 4: COMMAND REFERENCE, AUDIT TRAIL & TROUBLESHOOTING
  // ══════════════════════════════════════════════════════
  doc.addPage();
  addHeader("Executive Command Cheat Sheet & Audit Compliance", "Reference Guide, Audit Trail Standards & Incident Resolution");

  y = 36;

  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("7. Universal Voice & Text Commands Quick Reference", 14, y);

  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Role", "User Voice / Text Phrase", "Bot Function"]],
    body: [
      ["Student / Parent", "'Mera roll number 419 hai, meri baqaya fees kitni hai?'", "Verifies identity; outputs package, paid fees, and pending balance."],
      ["Student / Parent", "'Ahmad Khan s/o Muhammad Akram ka result dikhao'", "Fuzzy matches name + father name; displays exam marks table."],
      ["Teacher", "'Mera aaj ka timetable kya hai?' / 'Monday timetable'", "Fetches scheduled periods, room numbers, and sections from staff_timetable."],
      ["Teacher", "'Meri attendance aur advance salary ka record dikhao'", "Outputs monthly present/absent days and unrecovered advance salary."],
      ["Admin", "'[Photo of admission slip]'", "Extracts admission fields via AI Vision OCR; prompts for PIN confirmation."],
      ["Admin", "'CONFIRM 12345'", "Commits pending admission into Supabase LMS tables."],
      ["Admin", "'Roll 102 fee 15000 jama ho gayi PIN 12345'", "Records fee payment; auto-delivers receipt to parent."],
      ["Principal", "'Aaj ka institutional report dikhao'", "Delivers total strength, daily cash collection, staff punctuality summary."],
      ["Principal", "'delegate Ahmad Khan permissions admissions phone 03001234567'", "Initiates staff access delegation and sends WhatsApp OTP."],
      ["Principal", "'show delegated staff'", "Lists all active delegated staff, permissions, and onboarding status."],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 8: Audit Compliance & Troubleshooting
  doc.setTextColor(...primaryTeal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("8. Real-time Audit Trail & Incident Troubleshooting", 14, y);

  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Issue / Scenario", "Root Cause", "Recommended Resolution"]],
    body: [
      ["Voice Note not understood", "Excessive background noise or low audio buffer.", "Re-record voice note in a quiet room or type query as text."],
      ["OTP expired (60 mins)", "Staff did not complete verification in time.", "Principal re-delegates staff or triggers resend from Web Console."],
      ["PIN rejected repeatedly", "Incorrect 5-digit PIN entered.", "After 2 failures, system prompts for Biometric Face Selfie to reset PIN."],
      ["Face match failed", "Poor lighting, face covered, or unauthorized person.", "Retake camera selfie in good lighting facing camera directly."],
      ["Emergency Lockout", "Suspected account compromise.", "Principal clicks 'Revoke Access' in Web Console; account is disabled instantly."],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryTeal, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: darkSlate },
    margin: { left: 14, right: 14 },
  });

  addFooter(4, 4);

  // Save the PDF
  doc.save("Superior_College_WhatsApp_AI_Operations_Manual.pdf");
}
