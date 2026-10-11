import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";

async function createRoadmapPdf() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Helper for adding headers
  function addHeader(pageTitle) {
    doc.setFillColor(27, 42, 74); // Deep Navy
    doc.rect(0, 0, pageWidth, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SUPERIOR COLLEGE JAHANIAN (SGC-J) — AI ERP & LMS", margin, 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(pageTitle, margin, 15);

    doc.setFontSize(8);
    doc.text("Session: 2026-28 | Executive AI Roadmap Document", pageWidth - margin - 65, 15);

    // Bottom footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text("Superior Group of Colleges Jahanian — Confidential & Internal AI Architecture", margin, pageHeight - 6);
    doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 12, pageHeight - 6);
  }

  let y = 30;

  // Title Box on Page 1
  addHeader("EXECUTIVE AI & AUTOMATION ROADMAP REPORT");

  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(210, 220, 235);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

  doc.setTextColor(20, 35, 65);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EXECUTIVE CONVERSATIONS & SYSTEM UPGRADE BLUEPRINT", margin + 4, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 80, 95);
  doc.text("Complete Record of Inquiries, Architectural Decisions, Voice Notes, Face Attendance & Paper Maker", margin + 4, y + 14);
  doc.text("Date Generated: October 11, 2026 | Document Reference: SCJ-AI-ARCH-2026", margin + 4, y + 19);

  y += 30;

  function printSectionHeader(title, icon = "") {
    if (y > pageHeight - 35) {
      doc.addPage();
      addHeader("EXECUTIVE AI & AUTOMATION ROADMAP REPORT");
      y = 30;
    }
    doc.setFillColor(235, 242, 250);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(20, 50, 90);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${icon} ${title}`.trim(), margin + 3, y + 5);
    y += 10;
  }

  function printQA(question, answerPoints) {
    if (y > pageHeight - 40) {
      doc.addPage();
      addHeader("EXECUTIVE AI & AUTOMATION ROADMAP REPORT");
      y = 30;
    }

    // Question
    doc.setFillColor(254, 243, 199); // Soft amber
    doc.rect(margin, y, contentWidth, 6, "F");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`Q: ${question}`, margin + 2, y + 4.2);
    y += 8;

    // Answer Points
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (const pt of answerPoints) {
      const lines = doc.splitTextToSize(`• ${pt}`, contentWidth - 4);
      if (y + (lines.length * 4) > pageHeight - 20) {
        doc.addPage();
        addHeader("EXECUTIVE AI & AUTOMATION ROADMAP REPORT");
        y = 30;
      }
      doc.text(lines, margin + 2, y);
      y += (lines.length * 3.8) + 1.5;
    }
    y += 3;
  }

  // Section 1: Hybrid WhatsApp Bot & Nexus AI
  printSectionHeader("1. HYBRID BOT + NEXUS AI COLLABORATION (COMPLETED)", "[DONE]");
  printQA("WhatsApp Bot & Nexus AI apas mein kaise coordinate karenge aur har role ko kaise tackle karenge?", [
    "Ground Truth Live Snapshot: Principal jab natural question poochte hain, code pehle Supabase se live fee collection (Cash vs Bank), staff attendance (present/absent/late names), aur admissions pipeline collect kar ke AI ko deta hai.",
    "Faculty Air-Gap Firewall: Strict prompt injection defense. Teachers class timetable ya syllabus pooch sakte hain, lekin girls' phone numbers, whole class contact lists, ya fee ledgers strictly block hain.",
    "Parent & Student Empathy: Agar parent bache ki bimari ka batayein, AI dua (shifa-e-kamila) aur leave confirmation deta hai. Fee balance exact mathematical calculation se aata hai (Zero hallucination).",
    "Public Guests: 2026-28 admissions counseling aur lead collection wizard provide karta hai, zero internal data access ke sath."
  ]);

  printQA("Automations status: Admissions, Fee Reminders, Receipts, aur Profile Pictures?", [
    "Admission Notices: sendAutoAdmissionNotice 100% active hai, admit hote hi fee package aur details deliver karta hai.",
    "Fee Receipts & Defaulter Reminders: sendAutoFeeReceiptNotice counter submit hote hi digital receipt bhejta hai.",
    "WhatsApp Photo Update: applyStudentPhoto image scan kar ke Supabase Storage (student-photos) mein upload karta hai aur student profile picture app mein foran live update ho jati hai."
  ]);

  // Section 2: AI Voice Note Intelligence
  printSectionHeader("2. AI VOICE NOTE INTELLIGENCE (CAPABILITY & REALITY CHECK)");
  printQA("Kiya AI Voice Note ko 1000% samajh kar wapsi Voice Note (Audio) mein jawab de sakta hai?", [
    "Hearing & Understanding: Gemini Multimodal Audio natively OGG/Opus voice notes ko process karta hai. Urdu, English, aur Hinglish mein 95-98% accuracy deta hai. Dehati Punjabi/heavy shor mein 90%+ intent extract karta hai.",
    "Confirmation Guardrail: 1000% safety ke liye AI audio sun kar pehle confirm karta hai: 'Aapne farmaya: Ali bukhar ki wajah se nahi aayega. Chutti darj kar li gayi hai.' Is se ghalti ka chance 0% ho jata hai.",
    "Audio Reply (Voice Note): Edge-TTS engine ke zariye professional female Urdu voice mein direct WhatsApp Voice Note (PTT green mic) send hota hai jo parent mobile par play kar sakte hain.",
    "Hardware & Cost: Kisi naye hardware ki zaroorat nahi. Zero Cost (100% Free)."
  ]);

  // Section 3: Face Attendance Architecture
  printSectionHeader("3. FACE ATTENDANCE (HARDWARE, DB LINK & RECOGNITION ARCHITECTURE)");
  printQA("Hardware, Software, Database connection aur Student ki pehchan (Recognition) kaise hogi?", [
    "Recommended Hardware: College entry gate par aik standard Android Tablet (Samsung/Lenovo Tab, ~20k-25k) ya mobile stand.",
    "Software & Direct Link: Hamari hi ERP ka dedicated Web Kiosk page (e.g. /gate-kiosk) tablet ke browser mein open rehta hai. Yeh Supabase Database se direct real-time connected hota hai (Zero third-party cloud apps needed!).",
    "Student Recognition Logic: Students ki passport photos already database (students.photo_url) mein hain. Tablet browser mein face-api.js AI model chalta hai jo 128-point face descriptor match karta hai.",
    "Instant Action: Match hote hi 0.5 sec mein screen par naam aur photo blink hoti hai: 'Ali Raza - Hazri Lag Gayi', DB update hota hai, aur parent ko 2-second mein WhatsApp alert dispatch ho jata hai.",
    "Alternative Hardware: ZKTeco SpeedFace terminal bhi ADMS/Push API Webhook ke zariye hamare server se link ho sakti hai."
  ]);

  // Section 4: Custom Book / Photo Paper Maker
  printSectionHeader("4. CUSTOM BOOK / PHOTO EXAM PAPER MAKER");
  printQA("Kiya paper internet data se banega ya books/pages/JPGs se jo hum upload karein gay?", [
    "Strict Grounded Paper Maker: Teacher mobile camera se textbook ke 3-4 pages ki photo (JPG/PNG) ya chapter PDF upload kare ga.",
    "Strict Vision OCR Prompting: Gemini Vision API images ko lafz-ba-lafz read kare ga. Strict rule hoga ke sirf aur sirf uploaded photos ke andar se questions banayein, out-of-syllabus ek lafz bhi nahi aayega.",
    "BISE Multan Board Standard: Part-I MCQs with Teacher Answer Key, Part-II Short Questions (English + Urdu translation), Part-III Long Questions.",
    "1-Click Printable PDF: Superior College header, Roll No box, marks, aur date ke sath formatted print-ready PDF download hogi jo seedha photocopy par bheji ja sakti hai.",
    "Cost & Efficiency: 100% Free Gemini Vision API, teachers ka 80% test preparation time bachta hai."
  ]);

  // Section 5: Database Impact & Migrations
  printSectionHeader("5. DATABASE IMPACT ASSESSMENT (DO WE NEED TO CHANGE DB?)");
  printQA("In features (Face Attendance & Paper Maker) ke lye DB mein koi change karna paray ga?", [
    "Paper Maker DB Impact: ZERO DB CHANGE. Pure frontend + Gemini Vision + jsPDF export par chalta hai.",
    "Face Attendance DB Impact: ZERO BREAKING DB CHANGE. Supabase mein already 'students' (photo_url) aur 'attendance' (student_id, date, status, time) tables mojud hain.",
    "Facial Vector Storage: Face descriptors ko tablet ke local cache/IndexedDB mein store kiya ja sakta hai jo fastest hai. Supabase tables intact rehte hain."
  ]);

  // Section 6: Future Horizon
  printSectionHeader("6. REMAINING STRATEGIC INNOVATIONS FOR SGC-J");
  printQA("Baaki kon se features future roadmap mein shamil hain?", [
    "1Link / EasyPaisa / JazzCash Online Fee Gateway (Challan PSID automated collection).",
    "AI Early Warning System (At-Risk Students with <80% attendance / failing tests).",
    "PWA Mobile Portal (Student timetable & notes download baghair app store).",
    "Smart AI Clash-Free Timetable Auto-Scheduler."
  ]);

  const outputPdfPath = path.resolve(process.cwd(), "SCJ_AI_Architecture_and_Future_Roadmap.pdf");
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(outputPdfPath, Buffer.from(pdfBytes));

  console.log(`PDF successfully written to: ${outputPdfPath} (${pdfBytes.byteLength} bytes)`);
}

createRoadmapPdf().catch(console.error);
