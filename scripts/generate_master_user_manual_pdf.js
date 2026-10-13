import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

async function generateMasterManual() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Palette: Superior College Signature Colors
  const TEAL = [6, 78, 67];       // Superior Teal
  const GOLD = [217, 119, 6];     // Gold / Amber
  const NAVY = [15, 23, 42];      // Deep Slate / Navy
  const DARK = [30, 41, 59];      // Slate 800
  const MUTED = [100, 116, 139];  // Slate 500
  const LIGHT_BG = [248, 250, 252];
  const BORDER_COLOR = [226, 232, 240];

  function addHeader(chapterTitle) {
    doc.setFillColor(...TEAL);
    doc.rect(0, 0, pageWidth, 20, "F");

    // Gold accent stripe
    doc.setFillColor(...GOLD);
    doc.rect(0, 20, pageWidth, 1.2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("SUPERIOR COLLEGE JAHANIAN (SGC-J) — AI ERP & LMS", margin, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(chapterTitle, margin, 15);
    doc.text("Official Master Operations & User Training Manual (Session 2026-28)", pageWidth - margin - 88, 15);

    // Footer
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Superior Group of Colleges Jahanian — Internal Operations & AI Manual", margin, pageHeight - 7);
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 14, pageHeight - 7);
  }

  function addSectionTitle(title, y) {
    doc.setFillColor(...LIGHT_BG);
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, "FD");

    // Indicator pill
    doc.setFillColor(...TEAL);
    doc.rect(margin, y, 2.5, 8, "F");

    doc.setTextColor(...TEAL);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin + 5, y + 5.5);
    return y + 12;
  }

  function addSubHeading(title, y) {
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(title, margin, y);
    return y + 5;
  }

  function addParagraph(text, y, fontSize = 8.2) {
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    return y + (lines.length * 3.8) + 2;
  }

  function addCalloutBox(title, text, y, type = "tip") {
    const isTip = type === "tip";
    const bg = isTip ? [240, 253, 244] : [254, 243, 199];
    const border = isTip ? [187, 247, 208] : [253, 230, 138];
    const textCol = isTip ? [21, 128, 61] : [180, 83, 9];

    doc.setFontSize(8);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    const boxHeight = 7 + (lines.length * 3.6);

    doc.setFillColor(...bg);
    doc.setDrawColor(...border);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

    doc.setTextColor(...textCol);
    doc.setFont("helvetica", "bold");
    doc.text(isTip ? `ADMIN TIP / BEST PRACTICE: ${title}` : `IMPORTANT SYSTEM RULE: ${title}`, margin + 4, y + 5);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text(lines, margin + 4, y + 9.5);

    return y + boxHeight + 4;
  }

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Elegant decorative background bands
  doc.setFillColor(4, 120, 87);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFillColor(...GOLD);
  doc.rect(0, 40, pageWidth, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("SUPERIOR GROUP OF COLLEGES", pageWidth / 2, 85, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(253, 230, 138); // light gold
  doc.text("JAHANIAN CAMPUS (SGC-J)", pageWidth / 2, 95, { align: "center" });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 10, 115, contentWidth - 20, 75, 4, 4, "F");

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("COLLEGE ERP, LMS & AI TERMINAL", pageWidth / 2, 132, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(...TEAL);
  doc.text("Complete Step-by-Step Master User Manual & Operations SOP", pageWidth / 2, 140, { align: "center" });

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, 146, pageWidth - margin - 20, 146);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Official Guide for Principal, Admin Officers, Accountants, Receptionists & Faculty", pageWidth / 2, 154, { align: "center" });
  doc.text("Session: 2026-2028 (Normalized 2026-28) | Multi-Campus Architecture", pageWidth / 2, 161, { align: "center" });
  doc.text("Includes: Nexus AI Vision, Smart Gate Face Biometrics, & Hybrid WhatsApp Engine", pageWidth / 2, 168, { align: "center" });

  // Metadata Badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth / 2 - 45, 173, 90, 10, 2, 2, "F");
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("VERSION 2.5 • ENTERPRISE PRODUCTION RELEASE", pageWidth / 2, 179.5, { align: "center" });

  // Footer Cover
  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("CONFIDENTIAL & PROPRIETARY — STRICTLY FOR INTERNAL COLLEGE USE", pageWidth / 2, pageHeight - 20, { align: "center" });
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth / 2, pageHeight - 15, { align: "center" });

  // ==========================================
  // PAGE 2: TABLE OF CONTENTS & QUICK NAV
  // ==========================================
  doc.addPage();
  addHeader("TABLE OF CONTENTS & SYSTEM OVERVIEW");
  let y = 28;

  y = addSectionTitle("1. MANUAL TABLE OF CONTENTS & CHAPTER DIRECTORY", y);

  autoTable(doc, {
    startY: y,
    head: [["Ch #", "Module & Domain", "Core Functionality Covered", "Page"]],
    body: [
      ["01", "Access, Roles & Security", "Login, Super Admin, Permission matrix, Session normalization", "03"],
      ["02", "Executive Dashboard", "Live KPI gauges, Cash vs Bank balances, Navigation shortcuts", "03"],
      ["03", "Leads Management", "Pre-admission pipeline, call logs, follow-up stages, 1-click conversion", "04"],
      ["04", "Admissions & Enrollment", "Converting leads, packages, discounts, installments, cards & slips", "04"],
      ["05", "Active Students Management", "Student directory, program/section shifts, fee ledgers, archives", "05"],
      ["06", "Accounts & Fee Ledgers", "Challan collections, partial fee receipts, defaulters bulk WhatsApp", "05"],
      ["07", "Staff HR & Dynamic Payroll", "Staff directory, timetables, salary advances, late/absent deductions", "06"],
      ["08", "Gate Face Biometrics Kiosk", "Tablet PWA terminal, 07:54 AM timing windows, anti-duplicate scans", "06"],
      ["09", "Nexus AI Assistant", "DB grounded queries, voice notes, book photo exam paper maker", "07"],
      ["10", "WhatsApp AI Automation", "Hybrid bot, faculty air-gap firewall, parent queries, photo requests", "07"],
      ["11", "System Settings & Backup", "Campus customizations, theme, API keys, automated cloud backups", "08"]
    ],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 8.5, fontStyle: "bold" },
    styles: { fontSize: 7.8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 48, fontStyle: "bold" },
      2: { cellWidth: 105 },
      3: { cellWidth: 15, halign: "center" }
    }
  });

  y = doc.lastAutoTable.finalY + 8;

  y = addSectionTitle("2. ARCHITECTURAL PILLARS (HOW THE SYSTEM WORKS)", y);
  y = addParagraph(
    "Superior College Jahanian ERP is built on a high-availability cloud database (Supabase PostgreSQL) and client-side reactive state. Changes made on any terminal (such as tablet gate attendance or fee counters) synchronize in real-time across all connected computers without requiring page refreshes.",
    y
  );

  y = addCalloutBox(
    "SESSION NORMALIZATION RULE (CRITICAL CONTEXT)",
    "The ERP automatically enforces the session normalization hook. Any student admitted under session '2026-2028' will be automatically stored, indexed, and reported as '2026-28'. Keep this convention consistent across all manual searches and filter queries.",
    y,
    "rule"
  );

  // ==========================================
  // PAGE 3: CHAPTER 1 & CHAPTER 2
  // ==========================================
  doc.addPage();
  addHeader("CH 1: ACCESS & ROLES | CH 2: EXECUTIVE DASHBOARD");
  y = 28;

  y = addSectionTitle("CHAPTER 1: SYSTEM ACCESS, AUTHENTICATION & SECURITY ROLES", y);
  y = addSubHeading("1.1 Logging In & Identity Management", y);
  y = addParagraph(
    "All college personnel access the ERP via their registered official email and password. Upon successful authentication, the system evaluates permissions assigned in Settings > Sub-Admins and determines accessible sidebar tabs.",
    y
  );

  y = addSubHeading("1.2 Roles & Permission Matrix", y);
  autoTable(doc, {
    startY: y,
    head: [["Role Title", "Permitted Modules", "Financial Access", "Special Rights"]],
    body: [
      ["Super Admin", "All Modules (100% Full Access)", "Full (Incomes, Expenses, Profit)", "Sub-Admin creation, System Reset"],
      ["Principal", "Dashboard, Attendance, Academic, Reports", "Executive Collection View", "Closeout dispatch, AI insights"],
      ["Accountant", "Accounts, Fee Ledgers, Staff Advances", "Full Financial Mutations", "Receipt voucher issuance"],
      ["Admission Officer", "Leads, Admissions, Students Roster", "View Student Fee Packages", "1-Click Lead-to-Admission conversion"],
      ["Gate Operator", "Standalone Gate Terminal (/?gate=true)", "None (Restricted)", "Biometric scanning, manual roll call"]
    ],
    theme: "grid",
    headStyles: { fillColor: TEAL, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  y = doc.lastAutoTable.finalY + 8;

  y = addSectionTitle("CHAPTER 2: EXECUTIVE DASHBOARD & COLLEGE PULSE", y);
  y = addSubHeading("2.1 Live KPI Cards & Real-Time Metrics", y);
  y = addParagraph(
    "The Dashboard serves as the central flight deck for college management. It features dynamic counters displaying:\n" +
    "• Total Enrolled Students (segregated by Boys and Girls Campuses).\n" +
    "• Active Teaching Faculty and administrative staff.\n" +
    "• Today's Cash Book Collection: Instant breakdown of Cash-in-Hand vs Direct Bank Deposits.\n" +
    "• Live Student & Staff Attendance percentages for the current day.",
    y
  );

  y = addSubHeading("2.2 Quick Action Navigation", y);
  y = addParagraph(
    "Top-bar action buttons provide instant 1-tap shortcuts to: New Admission Entry, Fee Collection Modal, Gate Scanner Launcher, and WhatsApp Center without navigating deep menu hierarchies.",
    y
  );

  y = addCalloutBox(
    "CAMPUS SWITCHING FOR MULTI-CAMPUS AUDITING",
    "Users with Super Admin privileges can toggle the Campus Filter at the top-right to view 'Boys Campus', 'Girls Campus', or 'All Campuses Combined'. All statistics and fee aggregates instantly adjust based on the selected campus scope.",
    y,
    "tip"
  );

  // ==========================================
  // PAGE 4: CHAPTER 3 & CHAPTER 4
  // ==========================================
  doc.addPage();
  addHeader("CH 3: LEADS PIPELINE | CH 4: ADMISSIONS & ENROLLMENT");
  y = 28;

  y = addSectionTitle("CHAPTER 3: LEADS MANAGEMENT & PRE-ADMISSION PIPELINE", y);
  y = addSubHeading("3.1 Adding & Tracking Pre-Admission Inquiries", y);
  y = addParagraph(
    "When a prospective student or parent visits the campus or calls the helpline, enter their details in the Leads module:\n" +
    "1. Click '+ New Lead' button.\n" +
    "2. Enter Student Name, Father's Name, Contact Number, Previous School/College, and Matric Marks.\n" +
    "3. Set Initial Status: 'New', 'Contacted', 'Interested', 'Follow-up Required', or 'Not Interested'.\n" +
    "4. Record Counselor Notes: Details of counseling discussion, scholarship interest, or scheduled return visit.",
    y
  );

  y = addSubHeading("3.2 One-Click Conversion to Admitted Student", y);
  y = addParagraph(
    "Once the student decides to join Superior College, click the emerald 'Convert to Admission' button on their lead card. All lead data (personal details, parent phone, previous marks) automatically transfers to the Admissions module with zero duplicate typing.",
    y
  );

  y = addCalloutBox(
    "BULK LEADS EXCEL IMPORT",
    "College admission campaigns often generate hundreds of school visitor leads. Use the 'Import Excel' button in the Leads view to upload .xlsx rosters. The system automatically deduplicates phone numbers to prevent spam.",
    y,
    "tip"
  );

  y = addSectionTitle("CHAPTER 4: ADMISSIONS & ENROLLMENT MASTER FLOW", y);
  y = addSubHeading("4.1 Finalizing the Student Fee Package", y);
  y = addParagraph(
    "During admission entry, the counselor configures the financial contract:\n" +
    "• Total Standard Package (e.g. Rs. 140,000 for 2-year intermediate program).\n" +
    "• Scholarship / Concession: Enter merit or kin discount with written approval remarks.\n" +
    "• Admission Fee & Misc Funds: Finalize initial registration dues.\n" +
    "• Installment Plan: Select 6, 10, or 12 installments. The system automatically computes equal monthly dues.",
    y
  );

  y = addSubHeading("4.2 Allotting Student Roll Number & Generating Credentials", y);
  y = addParagraph(
    "Upon confirming admission, the system assigns a unique College ID (e.g. SGC-26-001). Admins can immediately click 'Print Admission Slip' and 'Generate Student ID Card' for high-resolution college-branded printouts.",
    y
  );

  // ==========================================
  // PAGE 5: CHAPTER 5 & CHAPTER 6
  // ==========================================
  doc.addPage();
  addHeader("CH 5: STUDENTS DIRECTORY | CH 6: FEE & ACCOUNTS");
  y = 28;

  y = addSectionTitle("CHAPTER 5: ACTIVE STUDENTS MANAGEMENT & ROSTER", y);
  y = addSubHeading("5.1 Roster Filtering & Student Dossiers", y);
  y = addParagraph(
    "The Students module contains all currently active students. Use top filters to isolate records by Academic Program (FSc Pre-Medical, Pre-Engineering, ICS, I.Com, FA), Section (A, B, C, Pink/Blue), and Session (2026-28).\n" +
    "Clicking on any student opens their Comprehensive 360° Dossier containing their fee history, attendance records, exam results, and parent contact information.",
    y
  );

  y = addSubHeading("5.2 Section Transfers & Student Promotions", y);
  y = addParagraph(
    "To move a student between sections or promote from Part-1 to Part-2, open the student edit drawer, modify Section/Part, and save. All timetable mappings and attendance registers instantly update.",
    y
  );

  y = addSectionTitle("CHAPTER 6: FEE MANAGEMENT, ACCOUNTS & DEFAULTERS", y);
  y = addSubHeading("6.1 Daily Fee Collection Workflow", y);
  y = addParagraph(
    "1. In Fee Management > Collect Fee, enter Student Roll Number or Name in the search bar.\n" +
    "2. The system loads their pending installment dues, previous dues, and current month challan.\n" +
    "3. Enter Amount Received and Payment Mode (Cash, Online Bank Transfer, or Bank Cheque).\n" +
    "4. Click 'Receive & Print Receipt'. An official dual-slip challan (College Copy + Student Copy) generates immediately.",
    y
  );

  y = addSubHeading("6.2 Defaulters Tracker & 1-Click WhatsApp Notices", y);
  y = addParagraph(
    "The 'Defaulters' sub-tab calculates all active students with outstanding dues exceeding the alert threshold (default Rs. 5,000). Admins can click 'Broadcast Defaulter Notices' to dispatch personalized WhatsApp payment reminders with remaining dues and bank account details.",
    y
  );

  y = addCalloutBox(
    "DAILY CASH BOOK CLOSING",
    "At the end of each working day, Accounts officers must visit Accounts > Cash Book to reconcile Cash Collected vs Operational Expenses paid. Click 'Close Day Ledger' to lock records and generate the daily audit slip for the Principal.",
    y,
    "tip"
  );

  // ==========================================
  // PAGE 6: CHAPTER 7 & CHAPTER 8
  // ==========================================
  doc.addPage();
  addHeader("CH 7: STAFF & PAYROLL | CH 8: GATE FACE BIOMETRICS");
  y = 28;

  y = addSectionTitle("CHAPTER 7: STAFF MANAGEMENT, TIMETABLE & DYNAMIC PAYROLL", y);
  y = addSubHeading("7.1 Staff Directory & Class Timetable Allocation", y);
  y = addParagraph(
    "Maintain complete faculty profiles including Base Salary, Qualifications, Subjects Taught, and Employment Status. The 'Timetable' sub-tab provides a drag-and-drop periodic matrix to assign lecture periods, ensuring zero teacher conflicts across sections.",
    y
  );

  y = addSubHeading("7.2 Salary Advance Tracking & Dynamic Deductions", y);
  y = addParagraph(
    "Staff advance loans are logged in Staff > Advances. Monthly deductions are set during advance approval. When generating monthly payroll, the system dynamically calculates:\n" +
    "Net Salary = Base Salary - Late Deductions - Absent Deductions - Advance Loan Recovery.\n" +
    "Salaries are 100% transparent and slips can be printed or sent via WhatsApp.",
    y
  );

  y = addSectionTitle("CHAPTER 8: TABLET GATE FACE ATTENDANCE KIOSK", y);
  y = addSubHeading("8.1 Gate Kiosk Setup & Standalone PWA Installation", y);
  y = addParagraph(
    "The Smart Gate kiosk runs standalone on any tablet placed at the college entrance:\n" +
    "• URL: http://<local-ip>:3000/?gate=true\n" +
    "• PWA Install: Tap the green 'Install on Tablet' button, or tap Chrome's 3 dots (⋮) > 'Install app' / 'Add to Home screen'.\n" +
    "• Fullscreen Terminal: Hides all browser URL bars and navigation buttons, creating a dedicated biometric hardware machine.",
    y
  );

  y = addSubHeading("8.2 Timing Windows & Automatic Late Classification", y);
  autoTable(doc, {
    startY: y,
    head: [["Time Window", "Clock Timing", "Scanner State", "Attendance Status Recorded"]],
    body: [
      ["Morning Regular Entry", "07:00 AM – 07:54 AM", "Green Scanner Active", "Present (On-Time Hazir ✓)"],
      ["Late Arrival Window", "07:54 AM – 08:30 AM", "Amber Scanner Active", "Late Arrival (Late Hazir ⏰)"],
      ["Off-Hours Lock", "08:30 AM – 01:30 PM", "Red Lockout Active", "Blocked (Requires Admin Passcode)"],
      ["Campus Exit Window", "01:30 PM – 03:30 PM", "Blue Departure Mode", "Punch Out Recorded (Departure ✓)"]
    ],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  y = doc.lastAutoTable.finalY + 6;

  y = addSubHeading("8.3 Anti-Passback Duplicate Lockout & Daily Closeout Flash", y);
  y = addParagraph(
    "The kiosk prevents proxy and repeated scanning. Once a face is verified for the day, subsequent scans display a polite 'Already Marked Today' notice without double-writing to database or re-sending WhatsApp notices.\n" +
    "At cut-off time, click 'Daily Flash & Closeout ⚡' in AttendanceView to review absentees and dispatch bulk notices to parents.",
    y
  );

  // ==========================================
  // PAGE 7: CHAPTER 9 & CHAPTER 10
  // ==========================================
  doc.addPage();
  addHeader("CH 9: NEXUS AI ASSISTANT | CH 10: WHATSAPP BOT");
  y = 28;

  y = addSectionTitle("CHAPTER 9: NEXUS AI ASSISTANT & ACADEMIC VISION", y);
  y = addSubHeading("9.1 Grounded Executive AI Inquiries", y);
  y = addParagraph(
    "Nexus AI connects directly to live Supabase database tables via the getExecutiveLiveSnapshot engine. The Principal can ask natural language questions in English or Roman Urdu:\n" +
    "• 'Aaj ki total cash collection kitni hui?'\n" +
    "• 'Kitne teachers aaj absent hain aur unke naam kia hain?'\n" +
    "• 'Session 2026-28 ke kitne admissions confirm ho chukay hain?'\n" +
    "Nexus AI provides 100% accurate, mathematically grounded responses with zero hallucination.",
    y
  );

  y = addSubHeading("9.2 Custom Book / Photo Exam Paper Maker", y);
  y = addParagraph(
    "Teachers can upload 3 to 5 photos of textbook pages or chapter PDFs into the Paper Maker tool. Gemini Multimodal Vision reads text via OCR and strictly generates BISE Multan Board formatted exam papers (MCQs with Answer Key, Short Questions with English/Urdu text, and Long Questions) exclusively from the uploaded pages, ready for 1-click college-branded photocopying.",
    y
  );

  y = addSectionTitle("CHAPTER 10: WHATSAPP AUTOMATION & AI BOT CENTER", y);
  y = addSubHeading("10.1 Hybrid WhatsApp Architecture & Security Air-Gap", y);
  y = addParagraph(
    "The WhatsApp system operates with an automated Baileys bridge and strict security firewalls:\n" +
    "• Faculty Air-Gap Firewall: Strictly prevents AI from revealing female student phone numbers, full class rosters, or internal financial ledgers to public inquiries.\n" +
    "• Student / Parent Bot: Provides medical empathy, leave confirmations, and exact fee challan math.\n" +
    "• Public Admissions Wizard: Guides Session 2026-28 inquiries with eligibility criteria and fee package outlines.",
    y
  );

  y = addSubHeading("10.2 Missing Photo Collection Wizard", y);
  y = addParagraph(
    "In AttendanceView, click 'Request Photos' to scan enrolled students missing ID pictures. The system dispatches an automated WhatsApp selfie request. When the student replies with a photo, the bot detects their face, uploads it to Supabase Storage, and links it to their profile for gate kiosk facial recognition.",
    y
  );

  // ==========================================
  // PAGE 8: CHAPTER 11 & SYSTEM CHEATSHEET
  // ==========================================
  doc.addPage();
  addHeader("CH 11: SETTINGS & SYSTEM MAINTENANCE CHEATSHEET");
  y = 28;

  y = addSectionTitle("CHAPTER 11: SETTINGS, BRANDING & CLOUD MAINTENANCE", y);
  y = addSubHeading("11.1 College Identity & Theming", y);
  y = addParagraph(
    "In Settings > General, configure College Name, Campus Title, Official Logo, Address, Contact Email, and Principal Signature. These settings dynamically brand all generated PDF challans, report cards, and student ID slips.",
    y
  );

  y = addSubHeading("11.2 Sub-Admins & Access Revocation", y);
  y = addParagraph(
    "Create sub-admin accounts for newly hired coordinators or accountants. Assign granular module permissions. In case of staff departure, toggle their status to 'Inactive' or delete their sub-admin profile to instantly revoke app access.",
    y
  );

  y = addSectionTitle("OPERATIONAL EMERGENCY CHEATSHEET & FAQS", y);

  autoTable(doc, {
    startY: y,
    head: [["Symptom / Scenario", "Immediate Recommended Action", "Resolution Time"]],
    body: [
      ["Tablet scanner shows 'Off-Hours Lock'", "Tap 'Admin Override' in top header, enter master PIN to scan", "5 Seconds"],
      ["Student face not recognized at gate", "Search roll number in kiosk search bar, tap '1-Tap Check-In'", "3 Seconds"],
      ["WhatsApp notices showing 'Failed'", "Check WhatsApp QR connection in Settings > WhatsApp, tap 'Reconnect'", "30 Seconds"],
      ["Student missing from Attendance list", "Click 'Sync Students' button in AttendanceView to refresh cache", "2 Seconds"],
      ["Monthly fee calculation mismatch", "Verify package and installment count in Students > Edit Package", "1 Minute"],
      ["Tablet browser showing URL address bar", "Tap 'Fullscreen Kiosk Now' in kiosk header to hide browser bars", "Instant"]
    ],
    theme: "striped",
    headStyles: { fillColor: TEAL, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2 }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Signoff Box
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...BORDER_COLOR);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("EXECUTIVE ENDORSEMENT & COMPLIANCE", margin + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...DARK);
  doc.text(
    "This operations manual represents the standard operating procedure for Superior Group of Colleges Jahanian ERP & LMS.\n" +
    "All administration officers, coordinators, and accounts personnel are required to adhere to the workflows outlined in this document.\n" +
    "Authorized by: Principal & Directorate of Information Technology, Superior Group of Colleges Jahanian.",
    margin + 4,
    y + 11
  );

  // Output paths: Root and public/downloads
  const rootPath = path.resolve(process.cwd(), "SCJ_ERP_LMS_Complete_Master_User_Manual.pdf");
  const downloadsDir = path.resolve(process.cwd(), "public", "downloads");
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }
  const publicPath = path.join(downloadsDir, "SCJ_ERP_LMS_Complete_Master_User_Manual.pdf");

  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(rootPath, Buffer.from(pdfBytes));
  fs.writeFileSync(publicPath, Buffer.from(pdfBytes));

  console.log(`[Success] Master Manual PDF generated successfully!`);
  console.log(`- Root Path: ${rootPath}`);
  console.log(`- Public Downloads Path: ${publicPath}`);
}

generateMasterManual().catch(err => {
  console.error("Manual generation failed:", err);
  process.exit(1);
});
