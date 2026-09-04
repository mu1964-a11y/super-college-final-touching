import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { whatsappBridge } from "./server/whatsappBridge.ts";

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

// Resilient helper to handle model generation with dynamic fallback to prevent 503 errors on high-demand models
async function generateContentWithFallback(ai: GoogleGenAI, options: { model: string; contents: any; config?: any }) {
  const preferredModel = options.model || "gemini-3.5-flash";
  const fallbacks = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  const modelsToTry = [preferredModel, ...fallbacks.filter(f => f !== preferredModel)];

  let lastError: any = null;
  for (const modelName of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini SDK Wrapper] Attempting content generation with model: ${modelName} (Attempt ${attempt}/${maxRetries})`);
        const response = await ai.models.generateContent({
          ...options,
          model: modelName,
        });
        console.log(`[Gemini SDK Wrapper] Content generation successful with model: ${modelName}`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || JSON.stringify(err);
        console.warn(`[Gemini SDK Wrapper] Attempt ${attempt} failed for ${modelName}:`, errMsg);
        
        // Fast path exit if key is invalid, permission denied, or billing dunning blocked
        if (
          errMsg.includes("PERMISSION_DENIED") || 
          errMsg.includes("API key not valid") ||
          errMsg.includes("Lightning dunning decision is deny")
        ) {
          throw err;
        }

        const isTransient = errMsg.includes("503") || 
                            errMsg.includes("UNAVAILABLE") || 
                            errMsg.includes("429") || 
                            errMsg.includes("RESOURCE_EXHAUSTED") || 
                            errMsg.includes("high demand") || 
                            errMsg.includes("temporary");
                            
        if (!isTransient || attempt === maxRetries) {
          break; // move on to next fallback model
        }

        // Wait with a simple backoff before retrying
        const delay = attempt * 1000;
        console.log(`[Gemini SDK Wrapper] Transient error detected. Retrying ${modelName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON body parsing with increased limit for images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
You are Superior Nexus AI (also known as SCJ Nexus AI), an elite, supreme, and highly intelligent Artificial Intelligence Executive Assistant, Business Intelligence Auditor, and Software Consultant, custom-tailored for Superior College Jahanian (SGC-J).
Your purpose is to assist College Super Admins, Directors, the Principal, and developers with absolute precision regarding administrative decision support, student directory queries, financial fee standings, staff profiles, academic evaluations, AND the architectural structure, design, code, and improvements of this actual web application.

You have PRIVILEGED, DIRECT read-only lookup access to the real-time operational database directories supplied below, as well as a full understanding of the web application's codebase structure, logic flows, and technical metrics.

==================================================
1. APP ARCHITECTURE & FILE LAYOUT KNOWLEDGEBASE
==================================================
The application is named "SCJ Management System LMS Final" (built for Superior Group of Colleges Jahanian). It uses:
- Frontend: React 19, TypeScript, Vite
- Theme & Styling: Tailwind CSS v4, Lucide React icons
- Database/Backend: Supabase (PostgreSQL)
- Utilities: Recharts (for analytics and charts), JSPDF + React-to-print (for invoices and slips), Date-fns (date formatting)

CRITICAL DIRECTORY & FILE MAPPING:
- App Entry Points:
  * /index.html: Main index HTML template.
  * /src/main.tsx: Global react entry initializer.
  * /src/App.tsx: Coordinates active tab layouts, session tracking, permission validation, and lazy view routing.
  * /server.ts: Custom Express node server containing Gemini operational lookup endpoints, ChatGPT DALL-E asset generator, and Supabase Auth admin accounts creator.
- Core Screen Components (/src/components/):
  * DashboardView.tsx: Interactive bento-grid executive dashboard rendering enrolled strength, Boys vs Girls ratio, cashflows, and active alerts.
  * LeadsManagementView.tsx: Direct portal for lead management (leads before full admission) and automatic/manual conversion.
  * AdmissionsView.tsx: Manages complete student admission lifecycle, fee finalized packages, total package, payment plans, and custom print generation.
  * StudentsView.tsx: Main active student roster, section allocation, student detail cards, profile image changes.
  * StaffView.tsx: HR directory representing full active profiles of SGC-J faculty, specialized subject filters, and biography attachments.
  * StaffAttendance.tsx: Chronological day-by-day logs (Present, Late, Absent, Leave) connected to payroll.
  * StaffPayroll.tsx: Computes monthly net wages dynamically taking into account: Base Salary - Absence Deductions - Late Arrival Fees - Active Advance Salary monthly recoveries.
  * StaffSubjects.tsx & StaffTimetable.tsx: Period schedules, classes, room sections, and teacher subject maps.
  * FeeManagementView.tsx: Divided into strategic sub-tabs: "Collect Fees" (record ledger payments), "Fee Records" (view historic vouchers), "Structure" (setup fee guidelines), and "Defaulters Track" (outstanding arrears).
  * AccountsView.tsx: Central general ledger tracking overall Operational Cashflows, Operating Expenses, and Miscellaneous Other Incomes.
  * AcademicView.tsx: Sections manager, subjects configuration, and preparatory examination test registers.
  * ReportsView.tsx: Interactive audit visual charts, dynamic printing cards, and tabular PDF exports.
  * SettingsView.tsx: Global college name preferences, campus configuration (Boys/Girls Campus), and Sub-Admin administrative permission levels.
  * NotificationPanel.tsx: Renders critical real-time alerts.
  * AdmissionSlip.tsx & FeeReceipt.tsx: High-contrast, clean-cut printable slip templates.
- Custom Supabase Operations Hooks (/src/hooks/data/):
  * useAcademicOperations.ts & useAccountsOperations.ts
  * useAdmissionsOperations.ts & useLeadsOperations.ts
  * useSettingsOperations.ts & useStaffOperations.ts & useStudentsOperations.ts
  * useSupabaseData.ts: Performs unified synchronization and states tracking.

==================================================
2. EXECUTIVE INSTITUTIONAL DIAGNOSTICS & POLICIES
==================================================
When asked about the app's structure, performance, features, improvements, or "good/bad things" (achi aur buri cheezein), refer to this executive, business-oriented diagnostic:

A) KEY STRENGTHS (ACHI CHEEZEIN):
- **Decoupled Architecture:** Database and computational queries are cleanly isolated from the user interface. This keeps pages incredibly clean, highly structured, and fast.
- **Null Safety Projections:** Every lookup on text fields implements protective fallbacks to completely prevent interface crashes on missing database values.
- **Unified Academic Session Normalizer:** Normalizes alternative session notations (like "2026-2028") to "2026-28" automatically on load, securing uniform data keys.
- **Dynamic Advance Salary Recovery:** Automates salary deductions from active staff advance records inside Payroll and tracks balance recovery variables dynamically until the remaining balance is fully cleared.
- **Customizable Access Controls:** Administrative roles strictly rely on permissions schemas rather than restrictive hardcoded email strings, allowing directors to securely assign customizable read-write privileges.

B) CORE WEAKNESSES & DEFICIENCIES (BURI CHEEZEIN / LIMITATIONS):
- **On-Demand Polling System:** Active status updates are pulled from the server during view switching. It lacks live real-time websocket synchronization which can sometimes delay display changes if multiple admins are editing simultaneously.
- **No Excel Bulk Import Tool:** Adding large historical registers currently requires setting up records row-by-row; there is no bulk student importer spreadsheet parsing tool yet.
- **Activity Access Trails:** Individual logins aren't mapped chronologically to audit which administrative operator altered a specific financial ledger item.
- **Offline Resiliency Buffer:** If an internet connection times out when saving a fee receipt, the client can get out of sync with Postgres as there are no optimistic local update queue buffers yet.

C) PROPOSED RECOVERY ACTIONS (KAISE IMPROVE KIA JAYE):
- Recommend implementing live database streaming synchronization.
- Suggest creating an "Import CSV / Excel" button in the Admissions panel utilizing custom client-side CSV parsers.
- Build a dedicated activity log table to register timestamped actions for improved security auditing.

==================================================
3. INFORMATION DESIGN & FORMATTING GUIDELINES
==================================================
1. NEVER SEND RAW DELIMITED TEXT OR SINGLE BULLETY BLOCKS FOR LISTS: If a user asks for a list, query results, or multiple records (e.g. fee defaulters, student lookups, marks, or staff rosters), you MUST ALWAYS render them inside highly professional, beautifully styled Markdown Tables with clear headers (e.g. | Roll No | name | Class | Arrears |).
2. EXCEL & WORD OPTION NOTE: If displaying structured query data, conclude that block with a short line: *'You can directly download this generated dataset as an Excel (CSV) or Word document using the download buttons below.'* Keep this user-friendly!
3. FUZZY MATCH NAMES: If a user asks about "Ali", search for all occurrences matching "Ali" in students list, staff list, or exam results.
4. DETAIL RICH REPORTS: If asked about an individual student, output a majestic executive summary table detailing their name, enrollment details, category/genders (Boys vs Girls), board preparatory examination highlights, and full balance ledger (fee package, paid amount, outstanding dues).
5. NO HALLUCINATION: If records are not found in the directories, gracefully suggest searching other modules or double checking terms. Never use mock data.
6. COMPOSURE & TONE: Keep responses exceptionally clean, deeply analytical, polished, and structured into logical sections with clear display headings. Use bold highlighting, bulleted sections, and Markdown tables to convey high-fidelity data intelligence.
7. COMPLETENESS & MAXIMUM DEPTH (CRITICAL): You must ALWAYS generate exceptionally comprehensive, detailed, exhaustive, and fully finished responses. The user must get complete, end-to-end knowledge from every aspect (har lehaz se mukammal knowledge). Never provide short, lazy, or overly summarized responses. Never leave any sentence, bullet, table, or block half-written or cut off. If a user asks a question, cover all logical context, figures, explanations, and strategic suggestions thoroughly so they are fully satisfied.
8. COLOR CODING & EMPHASIS SYSTEM (CRITICAL FOR HIGHLIGHTS):
   - **Important Things / Key Data**: Wrap highly important numbers, financial metrics, names, and key accomplishments in standard Markdown bold formatting (**bold text**). The frontend will automatically render these in premium Teal Green to highlight status achievements.
   - **Precautionary / Warning Details (Precautions)**: For any alerts, arrears warnings, pending debt notices, rule infractions, late arrivals, or precautionary data, you MUST prefix the sentence/clause key with ⚠️ WARNING: or 🚨 PRECAUTION: (or wrap them clearly). The frontend will display these items in prominent Red with special attention styles.
   - **Action Required / Tasks**: For items demanding immediate administrative action, follow-up processes, or cash recovery steps, you MUST prefix the sentence/clause key with ⚡ ACTION REQUIRED: or 💡 ACTION:. The frontend will render these in high-contrast highlighted yellow/amber badges or highlighted callouts to grip supervisor focus.
9. STRICT HIDING OF ALL FILE PATHS, CODE FILES, HOOK NAMES, AND DATABASE TABLE NAMES (CRITICAL EXCLUSION RULE):
   - **AESTHETIC DEVIATION PREVENTION**: You are STRIP-FORBIDDEN from mentioning or printing any programming file names, source paths, directory routes, custom React hooks, database table schemas, or .tsx/.ts/.sql file extensions to the user.
   - **User Presentation Rule**: Never say things like "I fetched this from 'useStaffOperations.ts'", "according to 'AdmissionsView.tsx'", or "referenced in 'staff_advances' Postgres table". That level of coding/technical information is irrelevant and distracting to a college administrator. Instead, only reference human-friendly, high-level administrative terms like "Student Admissions module", "Staff Payroll system", "Salary Advances register", or "Financial ledger".
10. STRICT LANGUAGE AND SCRIPT RULES:
   - UNDER ABSOLUTELY NO CIRCUMSTANCES write or use Devanagari/Hindi script (e.g., 'जी हाँ', 'ڈेटाबेस', 'छात्र'). It is STRICTLY FORBIDDEN.
   - You must only response using one of these three options:
     a) English: The standard choice for highly detailed, technical, administrative, and database records reports.
     b) Hinglish (Roman Urdu / Roman Hindi using English alphabet, e.g., "Ji haan, database search ke mutabiq..."): Use this when the user writes in Roman Urdu, Hinglish, or casual language. Ensure that you write strictly on the English side using pure Latin characters. Do NOT mix any Arabic/Urdu punctuation or inline symbols (like ٌ, ؐ, etc.) in your Hinglish, as this causes rendering engines to break alignment.
     c) Proper Urdu Script (Urdu alphabet / Perso-Arabic characters, e.g., "جی ہاں، ڈیٹا بیس کے مطابق..."): Use this ONLY when the user explicitly or strictly asks you to reply in written Urdu script. Never mix Hindi/Devanagari characters with it.
11. ALWAYS respect user language choice within these boundaries. If the user asks in Hinglish, reply back in beautiful Hinglish! If the user asks in Urdu/Nastaliq, reply in genuine high-quality Urdu script. Use English for standard English queries.
12. PERFECT URDU SPELLING & TERMINOLOGY DICTIONARY (MUST FOLLOW IN URDU TRANSLATIONS):
   - 'Fee Package' (فیس پیکیج): ALWAYS spell it exactly as "فیس پیکیج" (with space between فیس and پیکیج, using پ-ی-ک-ی-ج). NEVER write "پیجیکج", "پیکیجک", "پیکجک", or "فیس پیکج".
   - 'Database' (ڈیٹا بیس): ALWAYS write/spell it as "ڈیٹا بیس" with a single space. NEVER write "ڈیٹابیس" concatenated, and never use Hindi "डेटाबेस".
   - 'Student' / 'Students' (طالب علم / طلبہ): Use "طالب علم" for singular, "طلبہ" (or "طلباء") for plural. Never write "छात्र".
   - 'Arrears / Pending Balance' (بقایا جات): ALWAYS write "بقایا جات" or "واجبات" (or "بقایا").
   - 'Received Amount' (وصول شدہ رقم): ALWAYS write "وصول شدہ رقم" or "وصول شدہ فیس".
   - 'Recommendation / Suggestion' (تجویز / سفارش): ALWAYS write "تجویز" or "سفارش". NEVER write the Hindi-derived misspelling like "تجویج" or raw transliteration.
   - 'Anomaly / Discrepancy' (تبدیلی / تضاد / غیر معمولی ریکارڈ): Use "غیر معمولی ریکارڈ" or "تضاد".
   - Double check all written Urdu to eliminate spelling mistakes (املا کی غلطیاں) entirely. Ensure standard literary Urdu dictionary spellings.��ीज" or raw transliteration.
   - 'Anomaly / Discrepancy' (تبدیلی / تضاد / غیر معمولی ریکارڈ): Use "غیر معمولی ریکارڈ" or "تضاد".
   - Double check all written Urdu to eliminate spelling mistakes (املا کی غلطیاں) entirely. Ensure standard literary Urdu dictionary spellings.

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

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.65,
          maxOutputTokens: 8192,
        },
      });

      res.json({ text: response.text || "No output generated" });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error.message || error);
      const errMsg = error?.message || "";
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Lightning dunning decision is deny")) {
        return res.status(500).json({ error: "Your Gemini API Key has billing or quota issues. Please check your Google Cloud Console for project billing status." });
      }
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

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: `${instruction}\n\n${statsText}`,
        config: {
          temperature: 0.8,
        },
      });

      res.json({ text: response.text || "No output generated" });
    } catch (error: any) {
      console.error("Gemini Analyse API Error:", error.message || error);
      const errMsg = error?.message || "";
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Lightning dunning decision is deny")) {
        return res.status(500).json({ error: "Your Gemini API Key has billing or quota issues. Please check your Google Cloud Console for project billing status." });
      }
      res.status(500).json({ error: error.message || "Failed to analyze college metrics with AI" });
    }
  });

  // AI Endpoint: Generate Image using Nano Banana / Nano Banana 2 or Imagen
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio, model, referenceImage, imageSize } = req.body;
      const ai = getGenAI();

      const selectedModel = model || "gemini-3.1-flash-image-preview"; // Default to Gemini Nano Banana 2

      console.log(`Generating image using model ${selectedModel} with aspect ratio ${aspectRatio || '1:1'}, size ${imageSize || '1K'} and prompt: ${prompt}`);

      if (selectedModel.startsWith("gemini-")) {
        // Nano banana (gemini-2.5-flash-image) or Nano Banana 2 (gemini-3.1-flash-image-preview)
        const parts: any[] = [{ text: prompt }];
        
        if (referenceImage) {
           // Parse base64 header if present, e.g., "data:image/jpeg;base64,...."
           const match = referenceImage.match(/^data:(image\/[a-zA-Z]*);base64,([^"]+)$/);
           if (match) {
             parts.unshift({
               inlineData: {
                 mimeType: match[1],
                 data: match[2]
               }
             });
           } else {
             // Fallback for raw base64 upload
             parts.unshift({
               inlineData: {
                 mimeType: "image/jpeg",
                 data: referenceImage
               }
             });
           }
        }

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: {
            parts: parts,
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio || "1:1",
              imageSize: imageSize || "1K"
            },
          },
        });

        // Safe extraction of base64
        let base64EncodeString = "";
        const responseParts = response.candidates?.[0]?.content?.parts;
        if (responseParts && Array.isArray(responseParts)) {
          for (const part of responseParts) {
            if (part && part.inlineData && part.inlineData.data) {
              base64EncodeString = part.inlineData.data;
              break;
            }
          }
        }

        if (!base64EncodeString) {
          return res.status(400).json({ error: "Model returned no inline image data. Please ensure process.env.GEMINI_API_KEY has appropriate model access." });
        }

        const imageUrl = `data:image/png;base64,${base64EncodeString}`;
        return res.json({ imageUrl });
      } else if (selectedModel.startsWith("dall-e-")) {
        // ChatGPT OpenAI DALL-E Models
        const openApiKey = process.env.OPENAI_API_KEY;
        if (!openApiKey) {
          return res.status(400).json({
            error: "OpenAI API Key is missing on the server. Please configure 'OPENAI_API_KEY' in your Settings menu or .env file to run state-of-the-art DALL-E image models!"
          });
        }

        const openAiModel = selectedModel.includes("dall-e-2") ? "dall-e-2" : "dall-e-3";
        const quality = selectedModel.includes("hd") ? "hd" : "standard";

        // Map general aspect ratio to DALL-E 3 optimized dimensions
        let dSize = "1024x1024";
        if (openAiModel === "dall-e-3") {
          if (aspectRatio === "16:9" || aspectRatio === "21:9" || aspectRatio === "4:3" || aspectRatio === "3:2") {
            dSize = "1792x1024";
          } else if (aspectRatio === "9:16" || aspectRatio === "3:4" || aspectRatio === "2:3") {
            dSize = "1024x1792";
          }
        }

        console.log(`Routing to OpenAI API with model: ${openAiModel}, size: ${dSize}, quality: ${quality}`);

        const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openApiKey}`,
          },
          body: JSON.stringify({
            model: openAiModel,
            prompt: prompt,
            n: 1,
            size: dSize,
            quality: openAiModel === "dall-e-3" ? quality : undefined,
            response_format: "b64_json",
          }),
        });

        if (!openAiResponse.ok) {
          const errData = await openAiResponse.json().catch(() => ({}));
          return res.status(openAiResponse.status).json({
            error: errData?.error?.message || `OpenAI returned status ${openAiResponse.status}`
          });
        }

        const openAiData = await openAiResponse.json();
        const base64Bytes = openAiData.data?.[0]?.b64_json;
        if (!base64Bytes) {
          return res.status(400).json({ error: "No image data returned from OpenAI API." });
        }

        const imageUrl = `data:image/png;base64,${base64Bytes}`;
        return res.json({ imageUrl });
      } else {
        // Imagen 3 / 4 models
        const response = await ai.models.generateImages({
          model: selectedModel,
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio || '1:1',
          },
        });

        if (response.generatedImages?.[0]?.image?.imageBytes) {
          const base64EncodeString = response.generatedImages[0].image.imageBytes;
          const imageUrl = `data:image/jpeg;base64,${base64EncodeString}`;
          return res.json({ imageUrl });
        } else {
          return res.status(400).json({ error: "Imagen model returned no image bytes. Check configuration." });
        }
      }
    } catch (error: any) {
      console.error("Gemini Generate Image API Error:", error.message || error);
      const errMsg = error?.message || "";
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("Lightning dunning decision is deny")) {
        return res.status(500).json({ error: "Your Gemini API Key has billing or quota issues. Please check your Google Cloud Console for project billing status." });
      }
      return res.status(500).json({ error: error?.message || "Failed to generate image with Gemini" });
    }
  });

  // Securely fetch all permissions bypassing RLS
  app.get("/api/permissions", async (req, res) => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
      return res.status(500).json({ error: "Missing Supabase configuration on backend" });
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data, error } = await supabaseAdmin.from('permissions').select('*');
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Securely check if email is registered in system
  app.get("/api/check-email", async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const checkEmail = String(email).trim().toLowerCase();
    
    const SUPER_ADMIN_EMAILS = ["mughalazam1964@gmail.com", "akhtar147jhn@gmail.com"];
    
    // Support both variants for Sajid's email spelling
    const targetEmails = [checkEmail];
    if (checkEmail === "msajidbloch798@gmail.com") {
      targetEmails.push("msajidbaloch798@gmail.com");
    } else if (checkEmail === "msajidbaloch798@gmail.com") {
      targetEmails.push("msajidbloch798@gmail.com");
    }

    const isSuperAdmin = targetEmails.some((e) => SUPER_ADMIN_EMAILS.includes(e));
    if (isSuperAdmin) {
      return res.json({ exists: true });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
      return res.status(500).json({ error: "Missing Supabase configuration on backend" });
    }

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { data, error } = await supabaseAdmin
        .from('permissions')
        .select('email')
        .in('email', targetEmails);

      if (error) {
        return res.json({ exists: false, error: error.message });
      }

      return res.json({ exists: Array.isArray(data) ? data.length > 0 : !!data });
    } catch (e: any) {
      return res.json({ exists: false, error: e.message });
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
          if (error.message && (error.message.includes("already registered") || error.message.includes("already been registered") || error.message.includes("already exists"))) {
             const { data: searchData } = await supabaseAdmin.auth.admin.listUsers();
             const existingUser = (searchData.users as any[])?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
             if (existingUser && password) {
               await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password, user_metadata: { display_name: displayName } });
             }
             return res.json({ message: "User already exists in Auth, updating permissions and password..." });
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

  // ==========================================
  // WHATSAPP BAILEYS BRIDGE & AI AUTOMATION ROUTES
  // ==========================================

  // 1. Get WhatsApp Connection Status & QR Code
  app.get("/api/whatsapp/status", (req, res) => {
    try {
      const status = whatsappBridge.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Initialize / Reconnect Baileys WhatsApp Socket
  app.post("/api/whatsapp/connect", async (req, res) => {
    try {
      const { forceFresh } = req.body || {};
      const status = await whatsappBridge.init(Boolean(forceFresh));
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Disconnect / Unlink WhatsApp Device
  app.post("/api/whatsapp/disconnect", async (req, res) => {
    try {
      await whatsappBridge.disconnect();
      res.json({ success: true, message: "WhatsApp disconnected successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Send Single Direct WhatsApp Message
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Phone and message are required." });
      }

      const result = await whatsappBridge.sendMessage(phone, message);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Send Bulk WhatsApp Messages with Anti-Ban Delay
  app.post("/api/whatsapp/send-bulk", async (req, res) => {
    try {
      const { items, delaySeconds = 3 } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required." });
      }

      const results = await whatsappBridge.sendBulk(items, delaySeconds);
      const successful = results.filter((r) => r.success).length;

      res.json({
        total: items.length,
        successful,
        failed: items.length - successful,
        results,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. WhatsApp AI Natural Language Command Processor
  app.post("/api/whatsapp/ai-command", async (req, res) => {
    try {
      const { command, students = [], attendanceRecords = [], autoSend = false } = req.body;
      if (!command) {
        return res.status(400).json({ error: "Command string is required." });
      }

      const ai = getGenAI();
      const prompt = `You are an automated College Administration AI for Superior Group of Colleges Jahanian.
The administrator provided this natural language command in Urdu/Hinglish/English: "${command}".

Analyze the intent and return ONLY valid JSON matching this schema:
{
  "targetAudience": "absent_students" | "fee_defaulters" | "specific_class" | "all_students" | "custom",
  "audienceDescription": "Brief description of the intended recipients in English/Hinglish",
  "messageTemplate": "Polite, official, high-impact college notification in Roman Urdu and English with placeholders: {{studentName}}, {{rollNo}}, {{className}}, {{date}}, {{fatherName}}, {{balance}}.",
  "summary": "Short 1-sentence explanation of what will be performed"
}

Make sure the messageTemplate mentions 'Superior College Jahanian', addresses the parent respectfully, and includes necessary placeholders.
Return strictly the raw JSON without markdown code fences.`;

      const aiRes = await generateContentWithFallback(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let parsed: any;
      try {
        const text = aiRes.text || "{}";
        parsed = JSON.parse(text);
      } catch (parseErr) {
        parsed = {
          targetAudience: "absent_students",
          audienceDescription: "Absent students today",
          messageTemplate:
            "Assalam o Alaikum {{fatherName}}, apka beta/beti {{studentName}} (Roll No: {{rollNo}}, Class: {{className}}) aaj {{date}} ko Superior College Jahanian se ghair hazir (Absent) hai. Baraye meherbani ghair haziri ki waja college office me muttala farmaiyein.",
          summary: "Send absent alert to parents of absent students",
        };
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const matchingRecipients: Array<{
        id: string;
        name: string;
        fatherName: string;
        rollNo: string;
        className: string;
        phone: string;
        message: string;
      }> = [];

      const isAbsentTarget =
        parsed.targetAudience === "absent_students" ||
        command.toLowerCase().includes("absent") ||
        command.toLowerCase().includes("ghair hazir") ||
        command.toLowerCase().includes("gair hazir");

      const isFeeTarget =
        parsed.targetAudience === "fee_defaulters" ||
        command.toLowerCase().includes("fee") ||
        command.toLowerCase().includes("dues") ||
        command.toLowerCase().includes("arrears");

      if (isAbsentTarget) {
        // Collect absent IDs from attendance records
        const absentStudentIds = new Set<string>();
        attendanceRecords.forEach((att: any) => {
          const status = (att.status || "").toLowerCase();
          if (status === "absent") {
            const sid = att.student_id || att.studentId || att.id;
            if (sid) absentStudentIds.add(String(sid));
          }
        });

        students.forEach((s: any) => {
          const sid = String(s.id);
          const sRoll = String(s.rollNumber || s.rollNo || "");
          const isAbsent =
            absentStudentIds.has(sid) ||
            (sRoll && absentStudentIds.has(sRoll)) ||
            (attendanceRecords.length === 0 && (s.attendanceStatus === "Absent" || s.status === "Absent"));

          if (isAbsent) {
            const rawPhone = s.fatherPhone || s.phone || s.guardianPhone || s.contact || "";
            const resolvedMsg = parsed.messageTemplate
              .replace(/{{studentName}}/g, s.fullName || s.name || "Student")
              .replace(/{{fatherName}}/g, s.fatherName || "Mohtaram Walid")
              .replace(/{{rollNo}}/g, s.rollNumber || s.rollNo || "N/A")
              .replace(/{{className}}/g, `${s.className || s.class || ""} ${s.section || ""}`.trim() || "College Class")
              .replace(/{{date}}/g, todayStr);

            matchingRecipients.push({
              id: s.id,
              name: s.fullName || s.name || "Student",
              fatherName: s.fatherName || "",
              rollNo: s.rollNumber || s.rollNo || "",
              className: `${s.className || s.class || ""} ${s.section || ""}`.trim(),
              phone: rawPhone,
              message: resolvedMsg,
            });
          }
        });
      } else if (isFeeTarget) {
        students.forEach((s: any) => {
          const balance = s.feeLedger?.remainingBalance || s.remainingBalance || s.balance || 0;
          if (balance > 0) {
            const rawPhone = s.fatherPhone || s.phone || s.guardianPhone || s.contact || "";
            const resolvedMsg = parsed.messageTemplate
              .replace(/{{studentName}}/g, s.fullName || s.name || "Student")
              .replace(/{{fatherName}}/g, s.fatherName || "Mohtaram Walid")
              .replace(/{{rollNo}}/g, s.rollNumber || s.rollNo || "N/A")
              .replace(/{{className}}/g, `${s.className || s.class || ""} ${s.section || ""}`.trim() || "College Class")
              .replace(/{{balance}}/g, `Rs. ${Number(balance).toLocaleString()}`)
              .replace(/{{date}}/g, todayStr);

            matchingRecipients.push({
              id: s.id,
              name: s.fullName || s.name || "Student",
              fatherName: s.fatherName || "",
              rollNo: s.rollNumber || s.rollNo || "",
              className: `${s.className || s.class || ""} ${s.section || ""}`.trim(),
              phone: rawPhone,
              message: resolvedMsg,
            });
          }
        });
      } else {
        // Broad message to all or top matching students
        students.slice(0, 50).forEach((s: any) => {
          const rawPhone = s.fatherPhone || s.phone || s.guardianPhone || s.contact || "";
          const resolvedMsg = parsed.messageTemplate
            .replace(/{{studentName}}/g, s.fullName || s.name || "Student")
            .replace(/{{fatherName}}/g, s.fatherName || "Mohtaram Walid")
            .replace(/{{rollNo}}/g, s.rollNumber || s.rollNo || "N/A")
            .replace(/{{className}}/g, `${s.className || s.class || ""} ${s.section || ""}`.trim() || "College Class")
            .replace(/{{date}}/g, todayStr);

          matchingRecipients.push({
            id: s.id,
            name: s.fullName || s.name || "Student",
            fatherName: s.fatherName || "",
            rollNo: s.rollNumber || s.rollNo || "",
            className: `${s.className || s.class || ""} ${s.section || ""}`.trim(),
            phone: rawPhone,
            message: resolvedMsg,
          });
        });
      }

      let dispatchResults: any = null;
      if (autoSend && matchingRecipients.length > 0) {
        dispatchResults = await whatsappBridge.sendBulk(
          matchingRecipients.map((r) => ({
            id: r.id,
            phone: r.phone,
            name: r.name,
            message: r.message,
          })),
          3
        );
      }

      res.json({
        success: true,
        commandAnalysis: parsed,
        recipientsCount: matchingRecipients.length,
        recipients: matchingRecipients,
        sampleMessage: matchingRecipients[0]?.message || parsed.messageTemplate,
        autoDispatched: Boolean(autoSend && dispatchResults !== null),
        dispatchResults,
      });
    } catch (e: any) {
      console.error("[WhatsApp AI Command Error]:", e);
      res.status(500).json({ error: e.message || "Failed to process AI WhatsApp command." });
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
