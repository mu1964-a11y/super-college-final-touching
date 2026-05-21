import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper for lazy initialization of GenAI to prevent crashes at module load if variable is missing
let aiClientInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiClientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
    }
    aiClientInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': "aistudio-build",
        },
      },
    });
  }
  return aiClientInstance;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON body parsing
  app.use(express.json());

  // API routes can be added here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Endpoint: Chat & Decision Console Co-pilot
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, collegeContext } = req.body;
      const ai = getGenAI();

      const statsContext = collegeContext 
        ? `
Here is the real-time operational context of Superior College Jahanian:
- Total Enrolled Students: ${collegeContext.studentCount || 0} (Boys: ${collegeContext.boysCount || 0}, Girls: ${collegeContext.girlsCount || 0})
- Total Active Staff / Faculty: ${collegeContext.staffCount || 0}
- Current Outstanding Student Fees: Rs. ${(collegeContext.outstandingDues || 0).toLocaleString()}
- Total Active Revenue Collection: Rs. ${(collegeContext.revenue || 0).toLocaleString()}
- Total College Operating Costs (Expenses): Rs. ${(collegeContext.expenses || 0).toLocaleString()}
- Staff Monthly Wage Liability: Rs. ${(collegeContext.staffWageLiability || 0).toLocaleString()}
- Total Unrecovered Staff Advance Salaries: Rs. ${(collegeContext.staffAdvancesPaid || 0).toLocaleString()}
- Ongoing Session Academic Term: ${collegeContext.session || "2026-28"}
` 
        : "";

      // Format direct operational lookup records
      let detailedDatabaseCtx = "";
      if (collegeContext) {
        const studentsList = collegeContext.studentsList || [];
        const staffList = collegeContext.staffList || [];
        const marksList = collegeContext.marksList || [];

        if (studentsList.length > 0) {
          detailedDatabaseCtx += `\n--- ENROLLED STUDENTS DATABASE DIRECTORY ---\n`;
          studentsList.forEach((s: any) => {
            detailedDatabaseCtx += `- ID: ${s.id} | Name: ${s.name} | Father: ${s.fatherName} | Col_No: ${s.colNo} | Gender: ${s.gender} | Program: ${s.cat} (${s.grp}) Sec ${s.sec} | Part: ${s.part} | Term: ${s.session} | Total Fees Package: Rs. ${(s.pkg || 0).toLocaleString()} | Fees Received: Rs. ${(s.rec || 0).toLocaleString()} | Remaining Arrears: Rs. ${(s.bal || 0).toLocaleString()} | Phone: ${s.contact}\n`;
          });
        }

        if (staffList.length > 0) {
          detailedDatabaseCtx += `\n--- COLLEGE STAFF / TEACHERS DIRECTORY ---\n`;
          staffList.forEach((s: any) => {
            detailedDatabaseCtx += `- TEACHER_ID: ${s.id} | Name: ${s.name} | Role: ${s.role} | Status: ${s.status} | Base Salary: Rs. ${(s.salary || 0).toLocaleString()} | Qualification: ${s.qualification || "N/A"} | contact: ${s.contact || "N/A"}\n`;
          });
        }

        if (marksList.length > 0) {
          detailedDatabaseCtx += `\n--- ACADEMIC TEST RESULTS & EXAM MARKS ---\n`;
          marksList.forEach((r: any) => {
            detailedDatabaseCtx += `- Result: Name: ${r.studentName} (ID: ${r.studentId}) | Subject: ${r.subject} | Test Name: ${r.testName} | Score: ${r.obtained} Marks Out Of ${r.total} | Date: ${r.date} | Remarks: ${r.remarks || "No remarks"}\n`;
          });
        }
      }

      const systemInstruction = `
You are SCJ-AI, a supreme, premium Artificial Intelligence Executive Assistant custom-tailored for Superior College Jahanian (SGC-J).
Your purpose is to answer any request or query by College Super Admins, Directors, and the Principal, with absolute precision regarding individual student records, teacher parameters, test marks, and academic status.

You have PRIVILEGED, DIRECT read-only lookup access to the real-time operational database directories supplied below.

Guidelines for Database Queries:
1. FUZZY MATCH NAMES: If a user asks about "Ali" or "Muhammad Ali" or "Ayesha", lookup occurrences matching those names (case-insensitive) in the student directory, staff files, or exam results.
2. INDIVIDUAL STUDENT REPORT: If asked about a student, report their full name, father's name, college roll number, class stream (e.g. FSC/BS/DIT), session/term, and full financial fee standings (package value, received fees, and remaining pending dues).
3. TEACHER REPORT: If asked about a teacher or staff member, report their role, base salary, status, contact, and any other attributes.
4. EXAM MARKS & RESULTS RECOVERY: If asked about a student's marks, search the "ACADEMIC TEST RESULTS & EXAM MARKS" sector. Detail the subject, test type, marks obtained vs total marks, percentage, exam date, and teacher remarks.
5. NO HALLUCINATION: Always state exactly what is on the directory logs. If a student or teacher or marks are not recorded in the logs, politely state that they are not currently found in the system tables. Do not make up mock data.
6. ACTIONS: Offer to write WhatsApp templates, letters, or warning circular drafts for matching parents or late teachers where relevant.
7. LANGUAGE POLICY: You must respond in professional, friendly English, formatted with beautiful lists, bold styling, and clean blockquotes. (If requested, provide SMS/WhatsApp parents alerts in romanised Urdu/Urdu as well).

${statsContext}

${detailedDatabaseCtx}
`;

      const formattedContents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          formattedContents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
          });
        }
      }

      formattedContents.push({
        role: "user",
        parts: [{ text: message }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.65,
        },
      });

      res.json({ text: response.text || "No output generated" });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to process chat with AI" });
    }
  });

  // AI Endpoint: Executive SWOT & Audit Generation
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { collegeContext, requestType } = req.body;
      const ai = getGenAI();

      const statsText = `
College Metrics Data:
- Enrolled Strength: ${collegeContext.studentCount || 0} (Boys: ${collegeContext.boysCount || 0}, Girls: ${collegeContext.girlsCount || 0})
- Staff Faculty: ${collegeContext.staffCount || 0}
- Active Collection Overall: Rs. ${(collegeContext.revenue || 0).toLocaleString()}
- General College Expenses: Rs. ${(collegeContext.expenses || 0).toLocaleString()}
- Active Student Pending Fees (Outstanding): Rs. ${(collegeContext.outstandingDues || 0).toLocaleString()}
- Monthly Payroll Commitment: Rs. ${(collegeContext.staffWageLiability || 0).toLocaleString()}
- High-level Unrecovered Advance Payments: Rs. ${(collegeContext.staffAdvancesPaid || 0).toLocaleString()}
`;

      let instruction = "";
      if (requestType === "financial") {
        instruction = "You are an Executive Financial Auditor. Based on these metrics, draft a high-impact financial SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis, and provide 4 specific, actionable policies to recover outstanding dues and optimize monthly payroll costs for Superior College Jahanian.";
      } else if (requestType === "performance") {
        instruction = "You are a Chief Academic Auditor. Analyze student enrollment ratios (Boys vs Girls) and teacher-to-student capacities. Provide recommendations for student engagement and academic prestige goals in Jahanian.";
      } else {
        instruction = "You are an Elite Institutional Advisor. Provide a full strategic review, identifying immediate administrative bottlenecks, cashflow health, and a 3-month action plan to bolster admissions and operational oversight.";
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${instruction}\n\n${statsText}`,
        config: {
          temperature: 0.8,
        },
      });

      res.json({ text: response.text || "No output generated" });
    } catch (error: any) {
      console.error("Gemini Analyse API Error:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to analyze college metrics with AI" });
    }
  });

  // Securely create users in Supabase Auth from the Node.js backend
  app.post("/api/create-user", async (req, res) => {
    const { email, password, displayName } = req.body;
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
      return res.status(500).json({ error: "Missing Supabase configuration on backend" });
    }

    try {
      // Dynamic import to use server-side supabase client
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // 1. Create or retrieve user identity in Auth
      if (password) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: { display_name: displayName }
        });

        if (error) {
          // If user already exists, Supabase throws error, which we can catch or ignore based on code
          if (error.message && (error.message.includes("already registered") || error.message.includes("already exists"))) {
             return res.json({ message: "User already exists in Auth, updating permissions..." });
          }
          return res.status(400).json({ error: error.message });
        }
        return res.json({ message: "User created successfully", user: data.user });
      } else {
        // No password provided, so assume user was created manually and just return success to proceed with permission update
        return res.json({ message: "No password provided, assuming user already exists in Auth, updating permissions..." });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the dist folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
