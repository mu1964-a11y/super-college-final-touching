import { GoogleGenAI, Type } from "@google/genai";

export type CallerRole = "PRINCIPAL" | "STAFF" | "STUDENT_PARENT" | "UNVERIFIED_GUEST";

export type WhatsAppIntent =
  | "CONVERSATIONAL_ACK"
  | "GREETING_OR_MENU"
  | "MY_SALARY_SLIP"
  | "MY_ATTENDANCE"
  | "MY_TIMETABLE"
  | "MY_FEE_STATEMENT"
  | "MY_RESULT_CARD"
  | "MY_ADMISSION_SLIP"
  | "LEAVE_REQUEST"
  | "CNIC_VERIFICATION"
  | "UNAUTHORIZED_CROSS_QUERY"
  | "EXECUTIVE_REPORT"
  | "PRINCIPAL_STUDENT_LOOKUP"
  | "PUBLIC_ADMISSION_INQUIRY"
  | "GENERAL_CONVERSATION";

export interface IntentClassificationResult {
  intent: WhatsAppIntent;
  extractedCnic?: string;
  extractedDay?: string;
  ackReply?: string;
}

const CONVERSATIONAL_ACK_SET = new Set([
  "ok", "okay", "oky", "k", "kk", "acha", "achaa", "accha", "theek", "theek hai", "thek hai", "thik hai",
  "theek hy", "thek hy", "jee", "ji", "jee sir", "ji sir", "jee madam", "ji madam", "haan", "han", "g",
  "g sir", "shukriya", "shukria", "bohat shukriya", "bht shukriya", "thanks", "thank you", "thank u", "thx",
  "ty", "jazakallah", "jazak allah", "jazakallah khair", "mashallah", "alhamdulillah", "inshallah", "sahi",
  "sahi hai", "done", "noted", "good", "great", "nice", "fine", "👍", "🙏", "❤️", "👌", "✅"
]);

export function extract13DigitCnic(text: string): string | null {
  const match = text.match(/\b(\d{5}[-\s]?\d{7}[-\s]?\d{1}|\d{13})\b/);
  if (!match) return null;
  const digits = match[0].replace(/\D/g, "");
  return digits.length === 13 ? digits : null;
}

export function isConversationalAck(rawText: string): boolean {
  const clean = rawText
    .toLowerCase()
    .replace(/[!.,?~'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return false;
  if (CONVERSATIONAL_ACK_SET.has(clean)) return true;
  if (clean.length <= 22 && /^(ok+|jee+|ji+|theek|thek|shukriya|thanks|jazakallah|acha|sahi)\b/i.test(clean) && !/\b(fee|salary|sallery|result|hazri|attendance|timetable|roll|class)\b/i.test(clean)) {
    return true;
  }
  return false;
}

export async function classifyWhatsAppIntent(
  text: string,
  role: CallerRole,
  aiClient?: GoogleGenAI | null
): Promise<IntentClassificationResult> {
  const clean = text.toLowerCase().trim();

  // 1. Fast Deterministic Check: Conversational Acknowledgment ("Ok", "Jee sir", "Shukriya", etc.)
  if (isConversationalAck(text)) {
    return {
      intent: "CONVERSATIONAL_ACK",
      ackReply: "Jee behtar, shukriya! Superior College Jahanian Helpdesk har waqt aapki khidmat mein hazir hai.",
    };
  }

  // 2. Fast Deterministic Check: 13-Digit CNIC Verification
  const cnic = extract13DigitCnic(text);
  if (cnic && role === "UNVERIFIED_GUEST") {
    return {
      intent: "CNIC_VERIFICATION",
      extractedCnic: cnic,
    };
  }

  // 3. Fast Deterministic Check: Salary / Pay / Tankhwah / Advance (Any spelling variation)
  const isSalaryPattern =
    /\b(salary|sallery|salery|salry|tankhwah|tankhwa|tankha|pay\s*slip|payslip|pay|wages|advance|meri\s+pay|meri\s+salary|meri\s+sallery)\b/i.test(clean);

  if (isSalaryPattern) {
    if (role === "STAFF" || role === "PRINCIPAL" || role === "UNVERIFIED_GUEST") {
      return { intent: "MY_SALARY_SLIP" };
    }
  }

  // 4. Fast Deterministic Check: Staff asking for Student Data (Strict Air-Gap Firewall)
  if (role === "STAFF") {
    const asksForStudentData =
      /\b(student|talib|bachay|bache|larki|larka|roll\s*no|bsp-|sgc-26-|fee\s*ledger|defaulter|class\s*list|contact\s*number)\b/i.test(clean) &&
      !/\b(meri|mera|apni|apna|my)\b/i.test(clean);
    if (asksForStudentData) {
      return { intent: "UNAUTHORIZED_CROSS_QUERY" };
    }
  }

  // 5. Fast Deterministic Check: Timetable / Lecture Schedule
  if (
    /\b(timetable|time\s*table|schedule|mera\s*lecture|meri\s*class|aaj\s*ki\s*class|lectures)\b/i.test(clean) &&
    !/\b(lecturer)\b/i.test(clean)
  ) {
    return { intent: "MY_TIMETABLE" };
  }

  // 6. Fast Deterministic Check: Attendance / Hazri
  if (/\b(attendance|attendence|hazri|haziri|haazri|present|absent|ghair\s*hazir|late\s*arrival)\b/i.test(clean)) {
    return { intent: role === "PRINCIPAL" && /\b(staff|all|college|summary)\b/i.test(clean) ? "EXECUTIVE_REPORT" : "MY_ATTENDANCE" };
  }

  // 7. Fast Deterministic Check: Fee Statement / Receipt / Balance
  if (/\b(fee|fees|dues|baqaya|installment|receipt|statement|ledger|kitni\s*fee|remaining\s*balance)\b/i.test(clean)) {
    if (role === "STAFF") {
      return { intent: "UNAUTHORIZED_CROSS_QUERY" };
    }
    if (role === "PRINCIPAL" && /\b(today|aaj|aj|collection|total|college|month)\b/i.test(clean)) {
      return { intent: "EXECUTIVE_REPORT" };
    }
    return { intent: "MY_FEE_STATEMENT" };
  }

  // 8. Fast Deterministic Check: Exam Result / Marks
  if (/\b(result|results|marks|test\s*report|number|exam|grade|transcript)\b/i.test(clean)) {
    if (role === "STAFF") {
      return { intent: "UNAUTHORIZED_CROSS_QUERY" };
    }
    return { intent: "MY_RESULT_CARD" };
  }

  // 9. Fast Deterministic Check: Admission Slip
  if (/\b(admission\s*slip|admission\s*card|dakhla\s*slip|enrolment\s*slip)\b/i.test(clean)) {
    return { intent: "MY_ADMISSION_SLIP" };
  }

  // 10. Structured AI Intent Classification for Natural / Complex Sentences
  if (aiClient && clean.length >= 4) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Classify this WhatsApp message sent to Superior College Jahanian ERP Bot.
Caller Verified Role: ${role}
Message: "${text}"

Rules:
- If the message is a short acknowledgment ("Ok", "Jee sir", "Theek hai", "Shukriya"), return CONVERSATIONAL_ACK.
- If a STAFF member asks for any student's record, roll number, phone number, or fee, return UNAUTHORIZED_CROSS_QUERY.
- If asking about salary, tankhwah, pay slip, or advance salary (even with typos like "sallery"), return MY_SALARY_SLIP.
- If asking about attendance or hazri, return MY_ATTENDANCE.
- If asking about timetable or lecture schedule, return MY_TIMETABLE.
- If asking about fee receipt, fee statement, installments, or remaining balance, return MY_FEE_STATEMENT.
- If asking about exam marks or result card, return MY_RESULT_CARD.
- If asking for sick leave or urgent leave ("bimar hai", "chutti chahiye"), return LEAVE_REQUEST.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                enum: [
                  "CONVERSATIONAL_ACK",
                  "GREETING_OR_MENU",
                  "MY_SALARY_SLIP",
                  "MY_ATTENDANCE",
                  "MY_TIMETABLE",
                  "MY_FEE_STATEMENT",
                  "MY_RESULT_CARD",
                  "MY_ADMISSION_SLIP",
                  "LEAVE_REQUEST",
                  "CNIC_VERIFICATION",
                  "UNAUTHORIZED_CROSS_QUERY",
                  "EXECUTIVE_REPORT",
                  "PRINCIPAL_STUDENT_LOOKUP",
                  "PUBLIC_ADMISSION_INQUIRY",
                  "GENERAL_CONVERSATION",
                ],
              },
            },
            required: ["intent"],
          },
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      if (parsed?.intent) {
        return { intent: parsed.intent as WhatsAppIntent };
      }
    } catch {
      // Fallback to general conversation if AI classification times out
    }
  }

  return { intent: "GENERAL_CONVERSATION" };
}
