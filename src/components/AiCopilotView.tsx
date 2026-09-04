import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  BrainCircuit,
  Copy, 
  Check, 
  Loader2, 
  FileText, 
  Activity, 
  HelpCircle,
  Megaphone,
  Users,
  Mic,
  MicOff,
  Palette,
  Printer,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { safeLocalStorage } from "../utils/safeStorage";

interface AiCopilotProps {
  collegeContext: {
    studentCount: number;
    boysCount: number;
    girlsCount: number;
    staffCount: number;
    revenue: number;
    expenses: number;
    outstandingDues: number;
    staffWageLiability: number;
    staffAdvancesPaid: number;
    session: string;
    studentsList?: any[];
    staffList?: any[];
    marksList?: any[];
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const getLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = safeLocalStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    return defaultValue;
  }
};

const getLocalStorageHistory = (key: string, defaultHistory: ChatMessage[]): ChatMessage[] => {
  try {
    const item = safeLocalStorage.getItem(key);
    if (!item) return defaultHistory;
    const items = JSON.parse(item);
    return items.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp)
    }));
  } catch (error) {
    return defaultHistory;
  }
};

const safeSetLocalStorage = (key: string, value: any) => {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`[LocalStorage Safe-Guard] Failed to save key "${key}":`, error);
    try {
      // If it's a quota error, trim down or discard elements to relieve memory
      if (key === "scj_ai_imageGallery" && Array.isArray(value)) {
        if (value.length > 1) {
          // Keep only the most recent image
          safeLocalStorage.setItem(key, JSON.stringify(value.slice(-1)));
        } else {
          safeLocalStorage.removeItem(key);
        }
      } else if (key === "scj_ai_designOptions" && Array.isArray(value)) {
        if (value.length > 1) {
          // Keep only the single latest design option
          safeLocalStorage.setItem(key, JSON.stringify(value.slice(-1)));
        } else {
          safeLocalStorage.removeItem(key);
        }
      } else if (key === "scj_ai_chatHistory" && Array.isArray(value)) {
        if (value.length > 3) {
          // Crop the history to the latest 3 elements only
          safeLocalStorage.setItem(key, JSON.stringify(value.slice(-3)));
        } else {
          safeLocalStorage.removeItem(key);
        }
      } else {
        safeLocalStorage.removeItem(key);
      }
    } catch (innerError) {
      console.error(`[LocalStorage Safe-Guard] Critical recovery failure for key "${key}":`, innerError);
    }
  }
};

export default function AiCopilotView({ collegeContext }: AiCopilotProps) {
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<"chat" | "brand" | "swot" | "notices">(() =>
    getLocalStorage("scj_ai_activeTab", "chat")
  );

  // Chat State
  const [chatInput, setChatInput] = useState(() =>
    getLocalStorage("scj_ai_chatInput", "")
  );
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() =>
    getLocalStorageHistory("scj_ai_chatHistory", [
      {
        id: "welcome",
        role: "assistant",
        content: `### Welcome to the **Superior Nexus AI**! 🏛️⚡

I am your active artificial intelligence counsel, preloaded with the real-time operational database of **Superior College Jahanian**. 

Currently, I have fully indexed and have administrative lookup access to:
* **${collegeContext.studentCount}** registered students detail catalogs (${collegeContext.boysCount} Boys / ${collegeContext.girlsCount} Girls programs)
* **${collegeContext.staffCount}** active teachers & workforce profiles
* **${(collegeContext.marksList || []).length}** test results & exam academic records
* **Rs. ${collegeContext.outstandingDues.toLocaleString()}** in student outstanding dues
* Monthly payroll liability of **Rs. ${collegeContext.staffWageLiability.toLocaleString()}**

**Super Admin Privileges Active:** You can ask me absolute details about *any* specific student, teacher, class attendance, fees, outstanding dues, or exam test marks. I will lookup the live tables and give you precise bulleted reports. 

How can I assist you with college strategy, custom notices, or student audits today?`,
        timestamp: new Date()
      }
    ])
  );
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dynamic Excel (CSV) and MS Word Doc Exports for Chat Desk
  const handleExportCSV = (content: string, id: string) => {
    const lines = content.split("\n");
    const csvRows: string[] = [];
    let hasTableLines = false;
    
    for (const line of lines) {
      if (line.trim().startsWith("|") || line.includes("|")) {
        if (line.includes("---") || line.includes("-|-")) {
          continue;
        }
        if (line.replace(/[^|]/g, "").length < 2) {
          continue;
        }
        hasTableLines = true;
        const cells = line
          .split("|")
          .map(cell => cell.trim())
          .filter((cell, idx, arr) => {
            if (idx === 0 && cell === "") return false;
            if (idx === arr.length - 1 && cell === "") return false;
            return true;
          });
        
        if (cells.length > 0) {
          const csvLine = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",");
          csvRows.push(csvLine);
        }
      }
    }

    if (!hasTableLines) {
      csvRows.push(`"AI Response Content Export"`);
      lines.forEach(l => {
        if (l.trim()) {
          csvRows.push(`"${l.trim().replace(/"/g, '""')}"`);
        }
      });
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SGC_J_Excel_Export_${id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = (content: string, id: string) => {
    const formattedHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Superior Nexus AI Executive Report</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #333333; line-height: 1.6; padding: 25px; }
          h1 { color: #042d24; font-size: 18pt; border-bottom: 2px solid #c9a84c; padding-bottom: 5px; margin-bottom: 12px; font-weight: bold; }
          h2 { color: #c9a84c; font-size: 14pt; margin-top: 15px; margin-bottom: 8px; font-weight: bold; }
          h3 { color: #555555; font-size: 12pt; margin-top: 10px; font-weight: bold; }
          p { margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 10pt; }
          th, td { border: 1px solid #cccccc; padding: 6px 10px; text-align: left; }
          th { background-color: #042d24; color: #ffffff; font-weight: bold; }
          tr:nth-child(even) { background-color: #f7f7f7; }
          ul { margin-bottom: 10px; padding-left: 20px; }
          li { margin-bottom: 4px; }
          .footer { font-size: 8pt; color: #888888; text-align: right; margin-top: 30px; border-top: 1px solid #eeeeee; padding-top: 8px; }
        </style>
      </head>
      <body>
        <h1 style="text-align: center;">Superior Group of Colleges Jahanian</h1>
        <p style="text-align: center; font-size: 10pt; color: #666; font-style: italic; margin-bottom: 20px;">
          Superior Nexus AI Console & Administrative Decision Support Report
        </p>
        <hr style="border: 0; border-top: 1px solid #c9a84c; margin-bottom: 20px;" />
        ${convertMarkdownToHtml(content)}
        <div class="footer">Report compiled via Superior Nexus AI | ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + formattedHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SGC_J_Word_Export_${id}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertMarkdownToHtml = (markdownText: string): string => {
    const html = markdownText;
    const lines = html.split("\n");
    let inTable = false;
    let tableRowsHtml = "";
    const regularContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("|")) {
        if (!inTable) {
          inTable = true;
          tableRowsHtml = "<table>";
        }
        
        if (line.includes("---")) {
          continue;
        }
        
        const cells = line.split("|").map(c => c.trim()).filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);
        const isHeader = tableRowsHtml === "<table>";
        
        tableRowsHtml += "<tr>";
        cells.forEach(cell => {
          const rCell = cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          if (isHeader) {
            tableRowsHtml += `<th>${rCell}</th>`;
          } else {
            tableRowsHtml += `<td>${rCell}</td>`;
          }
        });
        tableRowsHtml += "</tr>";
      } else {
        if (inTable) {
          inTable = false;
          tableRowsHtml += "</table>";
          regularContent.push(tableRowsHtml);
          tableRowsHtml = "";
        }
        regularContent.push(line);
      }
    }
    
    if (inTable) {
      tableRowsHtml += "</table>";
      regularContent.push(tableRowsHtml);
    }
    
    let processedHtml = regularContent.join("\n");
    processedHtml = processedHtml.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    processedHtml = processedHtml.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    processedHtml = processedHtml.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    processedHtml = processedHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedHtml = processedHtml.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    processedHtml = processedHtml.replace(/^- (.*?)$/gm, '<li>$1</li>');
    processedHtml = processedHtml.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
    processedHtml = processedHtml.replace(/<\/ul>\s*<ul>/g, '');
    
    return processedHtml.split("\n\n").map(para => {
      const trimmed = para.trim();
      if (trimmed.startsWith("<h") || trimmed.startsWith("<table") || trimmed.startsWith("<ul") || trimmed.startsWith("<li")) {
        return trimmed;
      }
      return trimmed ? `<p>${trimmed}</p>` : "";
    }).filter(p => p !== "").join("\n");
  };

  // Strategy Analysis State
  const [analysisOutput, setAnalysisOutput] = useState(() =>
    getLocalStorage("scj_ai_analysisOutput", "")
  );
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // Notification Composer State
  const [noticeType, setNoticeType] = useState(() =>
    getLocalStorage("scj_ai_noticeType", "fee_default")
  );
  const [extraParams, setExtraParams] = useState(() =>
    getLocalStorage("scj_ai_extraParams", {
      deadlineDate: "May 30, 2026",
      installmentAllowed: "Yes",
      penaltyAmount: "Rs. 500",
      attendanceThreshold: "75%",
      parentMeetingTime: "10:00 AM"
    })
  );
  const [composedNotice, setComposedNotice] = useState(() =>
    getLocalStorage("scj_ai_composedNotice", "")
  );
  const [isNoticeLoading, setIsNoticeLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Voice command console state
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState("Microphone console inactive. Click the mic icon to activate voice query system.");
  const recognitionRef = useRef<any>(null);

  // Brand Design Studio State
  const [selectedTemplate, setSelectedTemplate] = useState<"admission" | "topper" | "circular" | "gala">(() =>
    getLocalStorage("scj_ai_selectedTemplate", "admission")
  );
  const [posterTheme, setPosterTheme] = useState<"emerald" | "ivory" | "dark">(() =>
    getLocalStorage("scj_ai_posterTheme", "emerald")
  );
  const [aiDesignPrompt, setAiDesignPrompt] = useState(() =>
    getLocalStorage("scj_ai_aiDesignPrompt", "")
  );
  const [isAiDesigning, setIsAiDesigning] = useState(false);
  const [showHtmlExport, setShowHtmlExport] = useState(() =>
    getLocalStorage("scj_ai_showHtmlExport", false)
  );

  // AI Real Graphic Designer (Imagen & Nano Banana 2) State
  const [imageGenPrompt, setImageGenPrompt] = useState(() =>
    getLocalStorage("scj_ai_imageGenPrompt", "")
  );
  const [enhancedDesignPrompt, setEnhancedDesignPrompt] = useState(() =>
    getLocalStorage("scj_ai_enhancedDesignPrompt", "")
  );
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [imageGenAspectRatio, setImageGenAspectRatio] = useState<"1:1" | "16:9" | "4:3" | "9:16" | "3:4" | "3:2" | "2:3" | "21:9">(() =>
    getLocalStorage("scj_ai_imageGenAspectRatio", "1:1")
  );
  const [imageGenQuality, setImageGenQuality] = useState<"1K" | "2K" | "4K">(() =>
    getLocalStorage("scj_ai_imageGenQuality", "1K")
  );
  const [imageGenModel, setImageGenModel] = useState<string>(() =>
    getLocalStorage("scj_ai_imageGenModel", "gemini-3.1-flash-image-preview")
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(() =>
    getLocalStorage("scj_ai_generatedImageUrl", null)
  );
  const [imageGallery, setImageGallery] = useState<string[]>(() =>
    getLocalStorage("scj_ai_imageGallery", [])
  );
  const [imageGenError, setImageGenError] = useState<string | null>(() =>
    getLocalStorage("scj_ai_imageGenError", null)
  );
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [uploadedDesignBase64, setUploadedDesignBase64] = useState<string | null>(() =>
    getLocalStorage("scj_ai_uploadedDesignBase64", null)
  );
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 4 Previews state (different designs)
  const [designOptions, setDesignOptions] = useState<{ url: string; prompt: string; resolution: "1K" | "2K" | "4K" }[]>(() =>
    getLocalStorage("scj_ai_designOptions", [])
  );
  const [isUpgradingResolution, setIsUpgradingResolution] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const [posterData, setPosterData] = useState(() =>
    getLocalStorage("scj_ai_posterData", {
      badge: "ADMISSIONS OPEN",
      title: "SUPERIOR COLLEGE JAHANIAN",
      subtitle: "ADMISSIONS OPEN — ACADEMIC SESSION 2026-28",
      headline: "LEADER IN BOARD MERIT POSITIONS",
      body: "Admissions are formally open for intermediate sciences, commerce, IT applications, and undergraduate streams. Join the highest-performing faculty in the region and secure your board academic merit list standings.",
      highlights: [
        "100% Free Education Plans for Board Merit Toppers",
        "Highly Experienced Punjab-level Expert Lecturers & PhD Faculty",
        "Cutting-edge Computer Coding, IT & Advanced Science Laboratories",
        "Premium Safe Transportation Network across all Jahanian Regions"
      ],
      dateVenue: "LAST DATE TO SUBMIT: JUNE 28, 2026",
      contact: "0304-4500122 | Main Bypass Road near Stadium Campus",
      signature: "Prof. Muhammad Hanif (Principal)"
    })
  );

  // Synchronize state variables to localStorage to prevent data loss on tab navigation
  useEffect(() => {
    try {
      // Clean up loading states from localStorage to unstick if stuck
      safeLocalStorage.removeItem("scj_ai_isGeneratingImage");
      safeLocalStorage.removeItem("scj_ai_isChatLoading");
      safeLocalStorage.removeItem("scj_ai_isAnalysisLoading");
      safeLocalStorage.removeItem("scj_ai_isNoticeLoading");
      safeLocalStorage.removeItem("scj_ai_isAiDesigning");
      safeLocalStorage.removeItem("scj_ai_isEnhancingPrompt");
    } catch (e) {
      console.warn("Cleanup error in localStorage:", e);
    }
  }, []);

  // Dynamically update welcome message statistics to always be perfectly in sync with real-time collegeContext
  useEffect(() => {
    if (collegeContext) {
      setChatHistory(prev => {
        const welcomeIdx = prev.findIndex(msg => msg.id === "welcome");
        if (welcomeIdx !== -1) {
          const updatedContent = `### Welcome to the **Superior Nexus AI**! 🏛️⚡

I am your active artificial intelligence counsel, preloaded with the real-time operational database of **Superior College Jahanian**. 

Currently, I have fully indexed and have administrative lookup access to:
* **${collegeContext.studentCount}** registered students detail catalogs (${collegeContext.boysCount} Boys / ${collegeContext.girlsCount} Girls programs)
* **${collegeContext.staffCount}** active teachers & workforce profiles
* **${(collegeContext.marksList || []).length}** test results & exam academic records
* **Rs. ${collegeContext.outstandingDues.toLocaleString()}** in student outstanding dues
* Monthly payroll liability of **Rs. ${collegeContext.staffWageLiability.toLocaleString()}**

**Super Admin Privileges Active:** You can ask me absolute details about *any* specific student, teacher, class attendance, fees, outstanding dues, or exam test marks. I will lookup the live tables and give you precise bulleted reports. 

How can I assist you with college strategy, custom notices, or student audits today?`;

          if (prev[welcomeIdx].content !== updatedContent) {
            const copy = [...prev];
            copy[welcomeIdx] = {
              ...copy[welcomeIdx],
              content: updatedContent
            };
            return copy;
          }
        }
        return prev;
      });
    }
  }, [collegeContext]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_chatInput", chatInput);
  }, [chatInput]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_chatHistory", chatHistory);
  }, [chatHistory]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_analysisOutput", analysisOutput);
  }, [analysisOutput]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_noticeType", noticeType);
  }, [noticeType]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_extraParams", extraParams);
  }, [extraParams]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_composedNotice", composedNotice);
  }, [composedNotice]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_selectedTemplate", selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_posterTheme", posterTheme);
  }, [posterTheme]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_aiDesignPrompt", aiDesignPrompt);
  }, [aiDesignPrompt]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_showHtmlExport", showHtmlExport);
  }, [showHtmlExport]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGenPrompt", imageGenPrompt);
  }, [imageGenPrompt]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_enhancedDesignPrompt", enhancedDesignPrompt);
  }, [enhancedDesignPrompt]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGenAspectRatio", imageGenAspectRatio);
  }, [imageGenAspectRatio]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGenQuality", imageGenQuality);
  }, [imageGenQuality]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGenModel", imageGenModel);
  }, [imageGenModel]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_generatedImageUrl", generatedImageUrl);
  }, [generatedImageUrl]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGallery", imageGallery);
  }, [imageGallery]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_imageGenError", imageGenError);
  }, [imageGenError]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_uploadedDesignBase64", uploadedDesignBase64);
  }, [uploadedDesignBase64]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_designOptions", designOptions);
  }, [designOptions]);

  useEffect(() => {
    safeSetLocalStorage("scj_ai_posterData", posterData);
  }, [posterData]);

  const getDynamicStepMessage = () => {
    if (estimatedTime === null) {
      return {
        step: "Ready",
        detail: "Superior Nexus AI Initializing Rendering Workspace...",
        statusUrdu: "System ready hai. Apni custom requirements prompt bar main likhein.",
        techInfo: "Idle connection stable."
      };
    }

    const rawPrompt = imageGenPrompt.trim().toLowerCase();
    
    // Extract key topic elements from user prompt
    let topic = "design layout structure";
    if (rawPrompt.includes("mehfil") || rawPrompt.includes("naat") || rawPrompt.includes("hamd") || rawPrompt.includes("sana")) {
      topic = "Mehfil-e-Hamd-o-Sana Islamic spiritual layouts, floral motifs, and beautiful calligraphy borders";
    } else if (rawPrompt.includes("sport") || rawPrompt.includes("gala") || rawPrompt.includes("cricket") || rawPrompt.includes("ground") || rawPrompt.includes("badminton") || rawPrompt.includes("athletic")) {
      topic = "Sports Gala event details, energetic player action outlines, and gold-trimmed tournament boundaries";
    } else if (rawPrompt.includes("welcome") || rawPrompt.includes("admission") || rawPrompt.includes("enrol") || rawPrompt.includes("college") || rawPrompt.includes("campus") || rawPrompt.includes("student")) {
      topic = "Academic admission info blocks, Jahanian campus logos, and professional educational banner designs";
    } else if (rawPrompt.includes("cert") || rawPrompt.includes("award") || rawPrompt.includes("position") || rawPrompt.includes("topper") || rawPrompt.includes("result")) {
      topic = "Premium student achievement layout, decorative gold medals, and custom merit border vectors";
    } else if (rawPrompt.includes("celebration") || rawPrompt.includes("party") || rawPrompt.includes("func") || rawPrompt.includes("annual")) {
      topic = "Vibrant event celebration lights, premium stage backdrops, and college ceremony invitations";
    }

    // Colors
    let colorTheme = "Superior Group colors (Emerald Green & Gold)";
    if (rawPrompt.includes("blue")) colorTheme = "Royal Superior Blue elements";
    else if (rawPrompt.includes("red")) colorTheme = "Specular Crimson Red highlights";
    else if (rawPrompt.includes("black") || rawPrompt.includes("dark")) colorTheme = "Dark Slate high-contrast themes";
    else if (rawPrompt.includes("white") || rawPrompt.includes("silver")) colorTheme = "Silver and platinum elegant layouts";

    if (estimatedTime > 20) {
      return {
        step: "Initializing & Semantic Analysis",
        detail: `Analyzing: "${imageGenPrompt.slice(0, 40)}..."`,
        statusUrdu: "Prompt parse ho rha hay. Structural directives set kiye ja rahy hain superior style main.",
        techInfo: `Superior Nexus AI is mapping initial raster grids with ${colorTheme}...`
      };
    }
    if (estimatedTime > 15) {
      return {
        step: "Vector Layout & Core Rendering",
        detail: `Synthesizing ${topic}`,
        statusUrdu: "Core design vectors ready ho rahy hain. Abhi design structure shape le raha hay.",
        techInfo: "Processing parallel style variations via Nexus High-Fidelity graphics nodes..."
      };
    }
    if (estimatedTime > 10) {
      return {
        step: "Color Gradients & Aesthetic Overlay",
        detail: `Applying ${colorTheme}`,
        statusUrdu: "Custom gold and texturizing layers generate ho rahy hain. Final colors fill kiye ja rahy hain.",
        techInfo: "Color balance matching active. 4 variant design versions rendered in background thread..."
      };
    }
    if (estimatedTime > 5) {
      return {
        step: "SGC Branding & High-Resolution Upscale",
        detail: "Mapping SGC Jahanian Crests & Subtext Typography",
        statusUrdu: "SGC official branding apply ho rhi hay. Final corporate college logos add kiye ja rahy hain.",
        techInfo: `Upscaling frames to ${imageGenQuality} UHD resolution. Applying bilinear pixel enhancers...`
      };
    }
    return {
      step: "Variant Polishing & Final Compilation",
      detail: "Readying Style Options 1 to 4",
      statusUrdu: "Render finalizing stage par hay! Borders and text contrasts check kr k pack kiya ja raha hay.",
      techInfo: "Compiling multiple design variants. Preparing download triggers. Ready in an instant..."
    };
  };

  // Prebuilt template details matching SGC-J context beautifully
  const prebuiltTemplates = {
    admission: {
      badge: "ADMISSIONS OPEN",
      title: "SUPERIOR COLLEGE JAHANIAN",
      subtitle: "ADMISSIONS OPEN — ACADEMIC SESSION 2026-28",
      headline: "CHOOSE SUCCESS. CHOOSE SUPERIOR.",
      body: "Admissions are formally open for intermediate sciences (FSc Pre-Med, Pre-Eng), ICS, I.Com, BS Programs, and IT application courses. Achieve academic excellence under our premium board coaches.",
      highlights: [
        "100% Free Education Plans for Board Merit Toppers",
        "Highly Experienced Punjab-level Expert Lecturers & PhD Faculty",
        "Cutting-edge Computer Coding, IT & Advanced Science Laboratories",
        "Premium Safe Transportation Network across all Jahanian Regions"
      ],
      dateVenue: "LAST DATE TO SUBMIT: JUNE 28, 2026",
      contact: "0304-4500122 | Main Bypass Road near Stadium Campus",
      signature: "Prof. Muhammad Hanif (Principal)"
    },
    topper: {
      badge: "ACADEMIC EXCELLENCE",
      title: "SUPERIOR GROUP OF COLLEGES JAHANIAN",
      subtitle: "HONOR ROLL & CONGRATULATIONS TO THE PRIDE OF JAHANIAN",
      headline: "CELEBRATING GRADE OUTSTANDING ACHIEVERS",
      body: "Under the elite academy coaching, our high-performing students have secured spectacular scores in the Multan Division Intermediate Board Exams, setting new legendary standings.",
      highlights: [
        "First Position in Jahanian Region Academic Stream",
        "Distinction in Physics, Chemistry and Computer Applications",
        "Awarded SGC Gold Medal of Honor and Cash Prize Award",
        "Special 100% Merit Waiver Program Granted for Advanced Studies"
      ],
      dateVenue: "Award Delivery: Next PTM Assembly at Jahanian Campus",
      contact: "Become Superior! Join the Champion Merit Batch today",
      signature: "Executive Director (Prof. Dr. M. Azam)"
    },
    circular: {
      badge: "OFFICIAL NOTICE",
      title: "SUPERIOR COLLEGE JAHANIAN",
      subtitle: "EXECUTIVE OFFICE ADMINISTRATIVE DIRECTIVE BOARD",
      headline: "MANDATORY ATTENDANCE & BIO-METRIC DIRECTIVES",
      body: "All registered intermediate and undergraduate students are strictly instructed to maintain a minimum of 75% attendance. Defaulters will be restricted from Multan Board annual exams validation.",
      highlights: [
        "Bio-metric daily reporting begins promptly at 07:45 AM",
        "Missed days immediately trigger automated WhatsApp alerts to parents",
        "Compulsory mock board preparatories occurring every Friday morning",
        "No entry in laboratory sessions without official uniforms and cards"
      ],
      dateVenue: "EFFECTIVE START: ACADEMIC CALENDAR MONTH 2026",
      contact: "Supervised by Administration Registry Office Jahanian",
      signature: "Vice Principal Academics Director"
    },
    gala: {
      badge: "CAMPUS EVENTS",
      title: "SUPERIOR COLLEGE JAHANIAN",
      subtitle: "ANNUAL SPORTS CHAMPIONSHIP & CULTURAL GALA 2026",
      headline: "CELEBRATING TEAMWORK, ATHLETICS & CULTURAL JOY",
      body: "We are ecstatic to invite our students, proud parents, and elite alumni to witness the grand campus sports festival. Expect thrilling sports matches, traditional foods, and scientific exhibitions.",
      highlights: [
        "Inaugural Ceremony by Respected Commissioner Board Guest",
        "Inter-Section Boys & Girls Cricket Tournament Final Matches",
        "Special Martial Arts, Drama Performance & Debate Showdowns",
        "Award & Trophy Deliverance Ceremony by SGC Principal Team"
      ],
      dateVenue: "Festival Date: June 15, 2026 (9:00 AM - 4:00 PM)",
      contact: "Free Admission Passes available at Jahanian Reception Desk",
      signature: "Organizing Committee SGC-J"
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US"; // Parses multiple accents and Roman Urdu text

      rec.onstart = () => {
        setIsListening(true);
        setSpeechFeedback("🎙️ Speech Recognition Live... State your command now!");
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          processVoiceCommand(transcript);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech console error", err);
        setSpeechFeedback(`⚠️ Microphone error description: ${err.error || "Device muted / permissions blocked"}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set Speech Active State
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        setSpeechFeedback("❌ Speech Recognition is not supported on this browser (Chrome / Edge recommended).");
        return;
      }
      try {
        setSpeechFeedback("Initializing audio capturing streams...");
        recognitionRef.current.start();
      } catch (e) {
        console.error("Mic restart error", e);
      }
    }
  };

  // Process voice keywords to automate actions like a boss
  const processVoiceCommand = (text: string) => {
    setChatInput(text);
    const lower = text.toLowerCase();
    setSpeechFeedback(`Captured Voice: "${text}"`);

    // Smart Command Intents Detection
    if (lower.includes("swot") || lower.includes("audit") || lower.includes("financial report") || lower.includes("fiscal")) {
      setActiveTab("swot");
      setSpeechFeedback(`Voice Action matched: [SWOT Audit]. Running strategic fiscal analytics...`);
      let requestType: "financial" | "performance" | "general" = "financial";
      if (lower.includes("academic") || lower.includes("results")) requestType = "performance";
      else if (lower.includes("general") || lower.includes("admin")) requestType = "general";
      runStrategicAnalysis(requestType);
    } 
    else if (lower.includes("design") || lower.includes("brand") || lower.includes("flyer") || lower.includes("poster") || lower.includes("studio")) {
      setActiveTab("brand");
      setSpeechFeedback(`Voice Action matched: [Brand Studio]. Loading requested flyer template...`);
      if (lower.includes("topper") || lower.includes("academic") || lower.includes("congratulate") || lower.includes("marks")) {
        handleLoadTemplate("topper");
      } else if (lower.includes("circular") || lower.includes("notice")) {
        handleLoadTemplate("circular");
      } else if (lower.includes("gala") || lower.includes("sports") || lower.includes("event")) {
        handleLoadTemplate("gala");
      } else {
        handleLoadTemplate("admission");
      }
    } 
    else if (lower.includes("compose") || lower.includes("draft notice") || lower.includes("sms draft") || lower.includes("broadcast")) {
      setActiveTab("notices");
      setSpeechFeedback(`Voice Action matched: [Broadcast Composer]. Preparing notices drafts...`);
      if (lower.includes("fee") || lower.includes("payment")) {
        setNoticeType("fee_default");
      } else if (lower.includes("late") || lower.includes("absent") || lower.includes("attendance")) {
        setNoticeType("low_attendance");
      } else {
        setNoticeType("ptm");
      }
      composeAIVariantNotice();
    }
    else if (lower.includes("clear chat") || lower.includes("reset chat") || lower.includes("conversation delete")) {
      setChatHistory([
        {
          id: "welcome",
          role: "assistant",
          content: `Voice command matched: [Clear Chat]. The AI Interactive Chatdesk is restored and database logs indexed. Tell me, how can I help Superior College now?`,
          timestamp: new Date()
        }
      ]);
      setSpeechFeedback("AI Chat has been restored successfully.");
    }
    else {
      // Direct Query Submission for Chat Desk
      setSpeechFeedback(`Voice matched general search query. Submitting context to SCJ AI...`);
      sendChatMessage(undefined, text);
    }
  };

  // Scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Run Strategic Analysis
  const runStrategicAnalysis = async (type: "financial" | "performance" | "general") => {
    setIsAnalysisLoading(true);
    setAnalysisOutput("");
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeContext,
          requestType: type
        })
      });
      const data = await response.json();
      if (data.error) {
        setAnalysisOutput(`⚠️ **AI Model Error**: ${data.error}`);
      } else {
        setAnalysisOutput(data.text);
      }
    } catch (err: any) {
      setAnalysisOutput(`❌ **Connection Error**: ${err.message || "Failed to reach backend server."}`);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Compose Notice & SMS drafts
  const composeAIVariantNotice = async () => {
    setIsNoticeLoading(true);
    setComposedNotice("");
    try {
      let customInstruction = "";
      if (noticeType === "fee_default") {
        customInstruction = `Compose an urgent, firm yet highly professional payment notice and SMS broadcast template to parents regarding outstanding student fees of Rs. ${collegeContext.outstandingDues.toLocaleString()}. Deadline to submit is ${extraParams.deadlineDate}. Mention that penalty fine of ${extraParams.penaltyAmount} will be applicable after due date. Offer ${extraParams.installmentAllowed === "Yes" ? "installments support if genuine reasons are filed at campus" : "no installments option without administrative approval"}. Ensure there is a section for Roman Urdu (WhatsApp style) and a formal English Letter notice draft.`;
      } else if (noticeType === "low_attendance") {
        customInstruction = `Draft a low attendance warning message and WhatsApp template to parents whose kids have attendance below ${extraParams.attendanceThreshold}. Ask them to report to the Principal's office at ${extraParams.parentMeetingTime} on coming Monday. Stress academic loss, college policies, and Punjab Board requirements. Send drafts in both English and Roman Urdu (highly readable, emotional yet official).`;
      } else {
        customInstruction = `Compose an elegant academic performance review report notification for the upcoming Parents-Teachers Meeting (PTM). PTM starting time is ${extraParams.parentMeetingTime} on ${extraParams.deadlineDate}. Encourage high parent turnout, feedback for faculty, and distribution of mid-term board preparatory results. Draft custom texts in English and Urdu romanized broadcast.`;
      }

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customInstruction,
          collegeContext
        })
      });
      const data = await response.json();
      if (data.error) {
        setComposedNotice(`⚠️ **Error composing circular**: ${data.error}`);
      } else {
        setComposedNotice(data.text);
      }
    } catch (err: any) {
      setComposedNotice(`❌ **Network Error**: ${err.message || "Failed to call composition endpoint."}`);
    } finally {
      setIsNoticeLoading(false);
    }
  };

  // Execute Custom Chat Message
  const sendChatMessage = async (e?: React.FormEvent, presetMessage?: string) => {
    if (e) e.preventDefault();
    const promptToSend = presetMessage || chatInput;
    if (!promptToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: promptToSend,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const historyPayload = chatHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptToSend,
          history: historyPayload,
          collegeContext
        })
      });

      const data = await response.json();
      if (data.error) {
        setChatHistory(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: `⚠️ **AI Process Error**: ${data.error}`,
          timestamp: new Date()
        }]);
      } else {
        setChatHistory(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: data.text,
          timestamp: new Date()
        }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: `❌ **Failed to reach server**: ${err.message || "Your server-side middleware is starting up. Please retry in 3 seconds."}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset prompts
  const presets = [
    "Suggest 3 ways to recover our outstanding dues of Rs. " + collegeContext.outstandingDues.toLocaleString() + ".",
    "Help me audit our monthly wage liability of Rs. " + collegeContext.staffWageLiability.toLocaleString() + ".",
    "Formulate a girls enrollment marketing strategy for Jahanian region.",
    "Show me detailed marks list records of students."
  ];

  // Load a brand studio preloaded design template
  const handleLoadTemplate = (type: "admission" | "topper" | "circular" | "gala") => {
    setSelectedTemplate(type);
    setPosterData(prebuiltTemplates[type]);
    setSpeechFeedback(`Preset design selected and updated: [${type.toUpperCase()}] template.`);
  };

  // Modify any field inside the poster data
  const handleEditPosterField = (field: string, value: any) => {
    setPosterData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditHighlight = (idx: number, val: string) => {
    const updated = [...posterData.highlights];
    updated[idx] = val;
    setPosterData(prev => ({
      ...prev,
      highlights: updated
    }));
  };

  // SGC-J AI Brand-Studio Layout Synthesizer! Runs on custom admin prompts
  const handleAIBandStudioDesign = async () => {
    if (!aiDesignPrompt.trim()) return;
    setIsAiDesigning(true);
    try {
      const designInstruction = `
You are the Creative Brand Director of Superior Group of Colleges. Formulate premium, print-ready college flyer card specifications based on this prompt: "${aiDesignPrompt}".
Return ONLY a valid, parseable JSON object matching the properties below, in plain text. Do not wrap it in any Markdown formatting (no triple backticks), and do not add any conversation.

JSON Template Structure:
{
  "badge": "A short, eye-catching action tag (e.g., ADMISSIONS 2026, STAR DEBATER, OFFICIAL NOTICE)",
  "title": "SUPERIOR COLLEGE JAHANIAN",
  "subtitle": "An elegant subtitle details matching the request (e.g. ANNUAL PRE-COMMENCEMENT MEETING)",
  "headline": "A bold, majestic headline to print at the center of the flyer",
  "body": "A detailed, beautiful paragraph detailing the exact achievements or rules requested, using clear SGC values.",
  "highlights": [
    "Compelling parameter / achievement bullet 1",
    "Compelling parameter / achievement bullet 2",
    "Compelling parameter / achievement bullet 3",
    "Compelling parameter / achievement bullet 4"
  ],
  "dateVenue": "Date, Time or Venue info details (e.g., Last Date: June 25 | SGC Auditorium Campus)",
  "contact": "Contact details or address references (e.g., 0304-4500122 | Jahanian Bypass Campus)",
  "signature": "Who is signing/authorizing the notice (e.g., Prof. Muhammad Hanif - Principal)"
}
`;

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: designInstruction,
          collegeContext
        })
      });

      const data = await response.json();
      if (!data.error && data.text) {
        let cleanedText = data.text.trim();
        if (cleanedText.startsWith("```")) {
          cleanedText = cleanedText.replace(/^```json|```$/g, "").trim();
        }
        
        try {
          const parsed = JSON.parse(cleanedText);
          setPosterData({
            badge: parsed.badge || "ANNOUNCEMENT CORE",
            title: parsed.title || "SUPERIOR COLLEGE JAHANIAN",
            subtitle: parsed.subtitle || "KNOWLEDGE EMBARKMENTS",
            headline: parsed.headline || "SUCCESS STARTS HERE",
            body: parsed.body || "Superior College is dedicated to establishing superior benchmarks of academic performance, sports endeavors and professional training.",
            highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 4) : ["High-standard academic preparation", "Dedicated modern campus bypass block"],
            dateVenue: parsed.dateVenue || "ADMINISTRATION DESK",
            contact: parsed.contact || "0304-4500122 | SGC Jahanian",
            signature: parsed.signature || "Principal SGC Jahanian"
          });
          setSpeechFeedback("🚀 SGC-J AI Brand studio successfully generated customized layout elements!");
        } catch (e) {
          console.error("JSON parsing error:", e);
          setSpeechFeedback("⚠️ AI created notice card content! Review fields inside the live editor or tweak formatting.");
          // Fallback parsing: extract fields if possible or notify
        }
      }
    } catch (err: any) {
      console.error("AI Nano Studio error:", err);
      setSpeechFeedback("❌ Backend error. Please verify connections or try again.");
    } finally {
      setIsAiDesigning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedDesignBase64(ev.target?.result as string);
        setSpeechFeedback("Reference design uploaded successfully.");
        setShowUploadMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enhance prompt with Gemini
  const handleEnhancePrompt = async () => {
    if (!imageGenPrompt.trim()) return;
    setIsEnhancingPrompt(true);
    setSpeechFeedback("🎨 PROMPTER: Synthesizing human intent into an elite graphic design prompt...");

    try {
      const prompterResponse = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Act as an expert AI Prompter and Art Director for "Superior Group of Colleges Jahanian" (SGC-J). 
The user wants to generate a graphic design. Enhance their basic idea into a highly detailed, extremely coherent prompt suitable for an elite AI image generator (like Imagen 3 or Midjourney). 
Specify aesthetic details: lighting, composition, camera angles, color palette (e.g. SGC Emerald Green, Gold, Crisp White).
Important: End the prompt with "Single coherent cohesive design, do not tile, do not repeat elements".
Return ONLY the final prompt text without conversational filler.

User's basic idea: "${imageGenPrompt}"`,
          collegeContext: {},
        })
      });

      const prompterData = await prompterResponse.json();
      const finalPrompt = (prompterData.text || imageGenPrompt).trim();
      setEnhancedDesignPrompt(finalPrompt);
      setSpeechFeedback("✨ PROMPTER finished! You can edit the prompt or select 'Generate' now.");
    } catch (err: any) {
      console.error(err);
      setSpeechFeedback("❌ Failed to enhance prompt.");
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Real graphic designer using Gemini Nano Banana 2 & Imagen models (4 design variants in parallel)
  const handleRealImageGeneration = async () => {
    const promptToUse = enhancedDesignPrompt.trim() || imageGenPrompt.trim();
    if (!promptToUse) return;
    
    setIsGeneratingImage(true);
    setImageGenError(null);
    setSpeechFeedback("✨ Calling Real-time Image Engine to render 4 design variations...");
    setEstimatedTime(25);

    const timer = setInterval(() => {
      setEstimatedTime(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
           return 1; // Hang at 1 second until complete
        }
        return prev - 1;
      });
    }, 1000);

    // Apply distinct design variation suffixes to avoid duplicates
    const promptVariations = [
      promptToUse,
      promptToUse + ", elegant clean modern layout with gold accents & premium typography",
      promptToUse + ", spectacular cinematic studio lighting, epic corporate poster composition",
      promptToUse + ", high-impact graphic design, extremely colorful vibrant hues, highly artistic layout"
    ];

    try {
      const promises = promptVariations.map(async (variantPrompt, idx) => {
        try {
          const response = await fetch("/api/gemini/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: variantPrompt,
              aspectRatio: imageGenAspectRatio,
              imageSize: imageGenQuality, // e.g. "1K", "2K", "4K"
              model: imageGenModel,
              referenceImage: uploadedDesignBase64 // Optional uploaded design
            })
          });
          const data = await response.json();
          if (data.imageUrl) {
            return {
              url: data.imageUrl,
              prompt: variantPrompt,
              resolution: imageGenQuality as "1K" | "2K" | "4K"
            };
          }
          console.error(`Variant ${idx + 1} empty or errored:`, data);
          return null;
        } catch (err) {
          console.error(`Failed to load variant ${idx + 1}:`, err);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

      if (validResults.length > 0) {
        setDesignOptions(validResults);
        setGeneratedImageUrl(validResults[0].url);
        
        // Push all to history
        const urls = validResults.map(r => r.url);
        setImageGallery(prev => [...urls, ...prev]);
        setSpeechFeedback(`✨ Successfully generated 4 premium design variations! Select styles below.`);
      } else {
        setImageGenError("All image variations failed. Check model configuration or try again.");
        setSpeechFeedback("❌ Error: Image variants rejected by server.");
      }
    } catch (err: any) {
      console.error(err);
      setImageGenError(err.message || "Network connection issue failed to reach image builder.");
      setSpeechFeedback("❌ Image generation request failed.");
    } finally {
      clearInterval(timer);
      setEstimatedTime(null);
      setIsGeneratingImage(false);
    }
  };

  // Direct triggering of download
  const triggerDirectDownload = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Promotion of design resolution and direct browser download
  const handleUpgradeAndDownload = async (targetQuality: "1K" | "2K" | "4K") => {
    if (!generatedImageUrl) return;

    setIsUpgradingResolution(true);
    setSpeechFeedback(`🚀 Upscaling and rendering design into high-performance ${targetQuality} resolution...`);

    try {
      // Create an image object to load the active preview image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = generatedImageUrl;

      // Wait for image content to fully load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load active preview image for upscaling."));
      });

      // Target width definitions
      let targetWidth = 1024;
      if (targetQuality === "2K") targetWidth = 2048;
      if (targetQuality === "4K") targetWidth = 4096;

      // Preserve aspect ratio precisely relative to natural dimensions
      const scaleFactor = targetWidth / img.naturalWidth;
      const targetHeight = Math.round(img.naturalHeight * scaleFactor);

      // Initialize canvas with high-resolution coordinates
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create canvas context.");
      }

      // Superior image smoothing scaling attributes
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw original image exactly into new upscaled dimensions
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Export as a high-density PNG file
      const upscaledDataUrl = canvas.toDataURL("image/png");

      // Trigger direct download of the matching image
      triggerDirectDownload(upscaledDataUrl, `sgc_j_design_${targetQuality}_${Date.now()}.png`);
      setSpeechFeedback(`✨ ${targetQuality} high-res master exported and downloaded successfully!`);
    } catch (err: any) {
      console.error("Upscaling error:", err);
      // Fallback: download original directly
      triggerDirectDownload(generatedImageUrl, `sgc_j_design_standard_${Date.now()}.png`);
      setSpeechFeedback("⚠️ Downloaded original resolution directly due to canvas processing constraint.");
    } finally {
      setIsUpgradingResolution(false);
      setDownloadModalOpen(false);
    }
  };

  // Direct printing function using highly reliable styled popup system
  const handlePrintPoster = () => {
    const posterDoc = document.getElementById("brand-studio-poster")?.innerHTML;
    if (!posterDoc) {
      setSpeechFeedback("❌ Error: Canvas empty.");
      return;
    }

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <html>
          <head>
            <title>Superior College Jahanian - SGC Brand Studio Printout</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&family=Noto+Nastaliq+Urdu&display=swap');
              body { 
                font-family: 'Inter', sans-serif; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
                background-color: white !important; 
                margin: 0;
                padding: 0;
              }
              .border-sgc { border: 1.5px solid #c9a84c !important; }
              .bg-emerald-sgc { background-color: #032d24 !important; color: white !important; }
              .text-gold-sgc { color: #c9a84c !important; }
              .cinzel-font { font-family: 'Cinzel', serif; }
              @page { size: portrait; margin: 40px; }
              @media print {
                body { padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body class="p-4 flex items-center justify-center min-h-screen">
            <div style="width: 100%; max-width: 780px;">
              ${posterDoc}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 800);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      setSpeechFeedback("🖨️ Direct printing workflow spawned! Optimized for high-resolution intermediate boards noticeboards.");
    }
  };

  // Rich Text Highlight Renderer & Warning/Action Callouts
  const renderTextWithHighlights = (text: string, isUser: boolean): React.ReactNode => {
    if (!text.includes("**")) {
      return text;
    }
    
    const parts = text.split("**");
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        // Bold content
        if (isUser) {
          return <strong key={idx} className="text-amber-300 font-extrabold">{part}</strong>;
        }

        const partLower = part.toLowerCase();
        const isAction = partLower.includes("action") || partLower.includes("required") || partLower.includes("necessary") || partLower.includes("important action") || partLower.includes("recovery");
        const isPrecaution = partLower.includes("caution") || partLower.includes("warn") || partLower.includes("precaution") || partLower.includes("alert") || partLower.includes("risk") || partLower.includes("deficit") || partLower.includes("arrear") || partLower.includes("penalty") || partLower.includes("defaulter") || partLower.includes("outstanding");

        if (isAction) {
          return (
            <span key={idx} className="bg-amber-150 hover:bg-amber-200/95 dark:bg-amber-950/50 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/40 rounded-xl px-2 py-0.5 font-black text-[11px] inline-flex items-center gap-1 mx-1 shadow-sm transition-all duration-300">
              ⚡ {part}
            </span>
          );
        }

        if (isPrecaution) {
          return (
            <span key={idx} className="bg-rose-50 hover:bg-rose-100/90 dark:bg-rose-950/40 text-rose-600 dark:text-rose-455 border border-rose-250 dark:border-rose-900/40 rounded-xl px-2 py-0.5 font-extrabold text-[11px] inline-flex items-center gap-1 mx-1 shadow-sm transition-all duration-300">
              🚨 {part}
            </span>
          );
        }

        // Standard Important highlight -> TEAL GREEN color instead of Gold!
        return (
          <strong key={idx} className="text-teal-700 dark:text-teal-400 font-black bg-teal-50/70 dark:bg-teal-950/20 px-1.5 py-0.5 rounded-lg border border-teal-100/50 dark:border-teal-900/10 mx-0.5 font-sans">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  const renderParagraphBlock = (para: string, pIdx: number, isUser: boolean) => {
    // Check if Urdu characters are dominant or have significant presence
    const isUrduScript = (text: string) => {
      const cleanText = text.replace(/\|/g, " ").trim();
      const countUrdu = (cleanText.match(/[\u0600-\u06FF]/g) || []).length;
      const countLatin = (cleanText.match(/[A-Za-z]/g) || []).length;
      // If there are at least 4 Urdu characters, or any Urdu characters making up at least 12% of the alpha characters, it's Urdu script
      return countUrdu > 4 || (countUrdu > 0 && countUrdu > countLatin * 0.12);
    };

    const isUrduHead = isUrduScript(para);

    // Markdown Heading: H4 (###)
    if (para.startsWith("###")) {
      const titleText = para.replace("###", "").trim();
      const isUrduTitle = isUrduScript(titleText);
      return (
        <h4 
          key={pIdx} 
          dir={isUrduTitle ? "rtl" : undefined}
          className={`font-extrabold uppercase tracking-tight mt-4 pb-1 border-b ${
            isUrduTitle 
              ? 'font-urdu text-[17px] leading-loose text-right border-r-3 border-teal-650 pr-2.5 ' + (isUser ? 'text-amber-300' : 'text-teal-600 dark:text-teal-400 border-teal-500/10') 
              : `text-xs border-slate-100 dark:border-slate-800 ${isUser ? 'text-amber-300' : 'text-teal-705 dark:text-teal-400 font-sans'}`
          }`}
        >
          {renderTextWithHighlights(titleText, isUser)}
        </h4>
      );
    }

    // Markdown Heading: H2 (##)
    if (para.startsWith("##")) {
      const titleText = para.replace("##", "").trim();
      const isUrduTitle = isUrduScript(titleText);
      return (
        <h3 
          key={pIdx} 
          dir={isUrduTitle ? "rtl" : undefined}
          className={`font-bold uppercase tracking-tight mt-5 pb-1 border-b ${
            isUrduTitle 
              ? 'font-urdu text-[19px] leading-loose text-right border-r-3 border-teal-650 pr-2.5 ' + (isUser ? 'text-amber-300' : 'text-teal-600 dark:text-teal-400 border-teal-500/20') 
              : `text-sm border-slate-100 dark:border-slate-800 ${isUser ? 'text-amber-350' : 'text-teal-705 dark:text-teal-400 font-sans'}`
          }`}
        >
          {renderTextWithHighlights(titleText, isUser)}
        </h3>
      );
    }

    // Markdown Heading: H1 (#)
    if (para.startsWith("#")) {
      const titleText = para.replace(/^#\s+/, "").trim();
      const isUrduTitle = isUrduScript(titleText);
      return (
        <h2 
          key={pIdx} 
          dir={isUrduTitle ? "rtl" : undefined}
          className={`font-black uppercase tracking-tight mt-6 pb-2 border-b-2 ${
            isUrduTitle 
              ? 'font-urdu text-[21px] leading-loose text-right border-r-4 border-teal-650 pr-2.5 ' + (isUser ? 'text-amber-355' : 'text-teal-600 dark:text-teal-400 border-teal-600/20') 
              : `text-base border-slate-205/50 dark:border-slate-800/50 ${isUser ? 'text-amber-355 font-sans' : 'text-teal-705 dark:text-teal-400 font-sans'}`
          }`}
        >
          {renderTextWithHighlights(titleText, isUser)}
        </h2>
      );
    }

    const lines = para.split("\n");

    // Table Parsing
    const isTableLine = lines.some(l => l.trim().startsWith("|"));
    if (isTableLine) {
      const tableLines = lines.filter(l => l.trim().startsWith("|"));
      if (tableLines.length > 0) {
        const headerLine = tableLines[0];
        const headerCells = headerLine.split("|").map(c => c.trim()).filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);
        const dataLines = tableLines.slice(1).filter(l => !l.includes("---") && l.trim() !== "");
        const isUrduTable = isUrduHead;
        
        return (
          <div key={pIdx} className={`w-full overflow-x-auto my-4 rounded-2xl border shadow-xs transition-all duration-300 ${isUser ? 'border-[#c9a84c]/20 bg-[#03221b]/40' : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10'}`}>
            <table dir={isUrduTable ? "rtl" : undefined} className={`min-w-full divide-y divide-slate-150 dark:divide-slate-800 text-left ${isUrduTable ? 'text-right font-urdu text-[14px] leading-relaxed' : 'text-[11px]'}`}>
              <thead className={`font-black uppercase ${isUser ? 'bg-[#031d17] text-amber-300' : 'bg-slate-50 dark:bg-slate-900/60 text-[#042d24] dark:text-[#c9a84c]'}`}>
                <tr>
                  {headerCells.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2.5 border-b border-transparent font-extrabold tracking-wider text-teal-850 dark:text-teal-300">
                      {cell.replace(/\*\*/g, "").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${isUser ? 'bg-[#042d24]/30 divide-[#c9a84c]/10 text-white' : 'bg-white dark:bg-slate-850 divide-slate-150 dark:divide-slate-800 text-slate-700 dark:text-slate-350'}`}>
                {dataLines.map((rowLine, rIdx) => {
                  const cells = rowLine.split("|").map(c => c.trim()).filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1);
                  return (
                    <tr key={rIdx} className={isUser ? "hover:bg-[#063a2e]" : "hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"}>
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 font-medium">
                          {renderTextWithHighlights(cell, isUser)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // List Parsing
    const isList = lines.every(l => l.trim().startsWith("*") || l.trim().startsWith("-"));
    if (isList) {
      const isUrduList = isUrduHead;
      return (
        <ul 
          key={pIdx} 
          dir={isUrduList ? "rtl" : undefined}
          className={`space-y-1.5 mt-2 my-2 ${isUrduList ? 'font-urdu text-[15px] leading-[2.2] text-right list-none pr-5 pl-0 border-r-2 border-emerald-500/20' : 'list-disc pl-5'} ${isUser ? 'text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}
        >
          {lines.map((l, lIdx) => {
            const cleaned = l.trim().substring(1).trim();
            return (
              <li key={lIdx} className="leading-relaxed">
                {renderTextWithHighlights(cleaned, isUser)}
              </li>
            );
          })}
        </ul>
      );
    }

    // Block-Level Warning & Action highlighting detection
    const textTrimmed = para.trim();
    const isWarningBlock = /^(⚠️|🚨|\[WARNING\]|\[PRECAUTION\]|WARNING:|PRECAUTION:|caution:|warning:)/i.test(textTrimmed);
    const isActionBlock = /^(⚡|💡|\[ACTION\]|ACTION REQUIRED:|ACTION:|action required:|action needed:)/i.test(textTrimmed);

    if (isWarningBlock && !isUser) {
      return (
        <div 
          key={pIdx} 
          dir={isUrduHead ? "rtl" : undefined}
          className={`bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-rose-500 p-4.5 rounded-r-2xl my-3 text-rose-800 dark:text-rose-250 hover:shadow-sm duration-300 transition-all border border-rose-100 dark:border-rose-900/30 flex items-start gap-3`}
        >
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div className={`font-medium text-xs md:text-sm leading-relaxed ${isUrduHead ? 'font-urdu text-[15px] leading-[2.1]' : 'font-sans'}`}>
            {renderTextWithHighlights(para, isUser)}
          </div>
        </div>
      );
    }

    if (isActionBlock && !isUser) {
      return (
        <div 
          key={pIdx} 
          dir={isUrduHead ? "rtl" : undefined}
          className={`bg-amber-50/70 dark:bg-amber-950/25 border-l-4 border-amber-500 p-4.5 rounded-r-2xl my-3 text-[#78350f] dark:text-amber-200 hover:shadow-sm duration-300 transition-all border border-amber-100 dark:border-[#78350f]/30 flex items-start gap-3`}
        >
          <span className="text-lg flex-shrink-0">⚡</span>
          <div className={`font-semibold text-xs md:text-sm leading-relaxed ${isUrduHead ? 'font-urdu text-[15px] leading-[2.1]' : 'font-sans'}`}>
            {renderTextWithHighlights(para, isUser)}
          </div>
        </div>
      );
    }

    // Default regular paragraph rendering
    return (
      <p 
        key={pIdx} 
        dir={isUrduHead ? "rtl" : undefined}
        className={`font-medium leading-relaxed ${isUrduHead ? 'font-urdu text-[16px] leading-[2.2] text-right' : 'font-sans'} ${isUser ? 'text-white' : 'text-slate-700 dark:text-slate-205'}`}
      >
        {renderTextWithHighlights(para, isUser)}
      </p>
    );
  };

  return (
    <div className="space-y-6 relative" id="ai-copilot-view">
      {/* Visual Ambient Effects */}
      <div className="absolute top-[20%] left-1/4 w-96 h-96 bg-superior-gold/5 rounded-full blur-[110px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[30%] right-1/4 w-96 h-96 bg-superior-teal/5 rounded-full blur-[130px] -z-10 pointer-events-none" />

      {/* Main Glassmorphic Module */}
      <div className="bg-white/95 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-[2.50rem] shadow-2xl overflow-hidden flex flex-col">
        
        {/* PREMIUM BRANDED EXECUTIVE HEADER */}
        <div className="px-6 py-5 md:px-8 bg-gradient-to-r from-[#032d24] to-[#085a4e] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-6 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,168,76,0.15),transparent_60%)] pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#c9a84c] to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/10 active:scale-95 transition-all">
              <BrainCircuit size={26} className="text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight font-sans">
                  Superior Nexus AI
                </h3>
              </div>
              <p className="text-[9.5px] text-amber-200 font-extrabold uppercase tracking-[0.25em] mt-0.5">
                Superior Group of Colleges Jahanian Real-time Intelligence Hub
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <span className="hidden sm:inline-block text-[10px] font-bold text-white/50 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/10">
              Live Connection OK
            </span>
            <div className="bg-[#c9a84c] text-slate-950 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-1.5 font-mono">
              <Sparkles size={11} />
              NANO MULTI-ENGINE
            </div>
          </div>
        </div>



        {/* NAVIGATION TABS SELECTOR */}
        <div className="flex overflow-x-auto bg-slate-50 dark:bg-slate-950/60 p-2 gap-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none">
          {[
            { id: "chat", label: "💬 AI CHATDESK", color: "text-[#c9a84c]" },
            { id: "brand", label: "🎨 SGC BRAND STUDIO", color: "text-superior-teal" },
            { id: "swot", label: "📊 SWOT DECISION AUDITOR", color: "text-blue-500" },
            { id: "notices", label: "📢 CIRCULARS & BROADCASTS", color: "text-emerald-500" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 px-4 md:px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all ${
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md border-b-[3px] border-[#c9a84c]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB WORKSPACES FRAME */}
        <div className="p-6 md:p-8 flex-1">
          
          {/* TAB 1: EXECUTIVE GPT CHAT CONSOLE */}
          {activeTab === "chat" && (
            <div className="space-y-6">
              
              {/* Chat Output Frame - Increased Height for Optimal Layout and Executive Premium Feeling */}
              <div className="space-y-6 min-h-[620px] max-h-[820px] overflow-auto bg-gradient-to-b from-slate-50 to-slate-100/40 dark:from-slate-950/20 dark:to-slate-950/80 p-8 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-850/90 shadow-2xs">
                <AnimatePresence initial={false}>
                  {chatHistory.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3.5 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Premium Executive Avatar layout */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-sm transition-all duration-300 ${
                        msg.role === "user" 
                          ? "bg-gradient-to-br from-slate-800 to-slate-950 border-slate-700/60 text-white" 
                          : "bg-gradient-to-br from-[#042d24] to-[#043329] border-[#c9a84c]/20 text-white"
                      }`}>
                        {msg.role === "user" ? <Users size={17} className="text-slate-300" /> : <BrainCircuit size={17} className="text-[#c9a84c] animate-pulse" />}
                      </div>
                      
                      {/* Message body */}
                      <div className={`p-6 rounded-3xl text-sm leading-relaxed transition-all duration-300 ${
                        msg.role === "user" 
                          ? "bg-gradient-to-br from-[#042d24] via-[#0b483b] to-[#042d24] text-white rounded-tr-none border border-[#c9a84c]/20 shadow-md" 
                          : "bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-750"
                      }`}>
                        <div className="space-y-3">
                          {msg.content.split("\n\n").map((para, pIdx) => {
                            return renderParagraphBlock(para, pIdx, msg.role === "user");
                          })}
                        </div>

                        {/* EXPORTS FOR ASSISTANT MESSAGES */}
                        {msg.role === "assistant" && (
                          <div className="mt-4 pt-3.5 border-t border-slate-150 dark:border-slate-800/60 flex flex-wrap gap-2 items-center">
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest mr-1 select-none">
                              ⚙️ EXECUTIVE CONTROLS:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleExportCSV(msg.content, msg.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold text-[9.5px] uppercase tracking-wider border border-emerald-150 dark:border-emerald-900/40 transition-all cursor-pointer shadow-xs active:scale-[0.97]"
                              title="Download structured records as a Microsoft Excel friendly CSV file"
                            >
                              <span>📥 Excel/CSV</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportWord(msg.content, msg.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold text-[9.5px] uppercase tracking-wider border border-blue-150 dark:border-blue-900/40 transition-all cursor-pointer shadow-xs active:scale-[0.97]"
                              title="Download professional report as Microsoft Word (.doc) format"
                            >
                              <span>📄 Word Document</span>
                            </button>
                          </div>
                        )}
                        <span className={`text-[8px] block text-right mt-3 font-mono ${msg.role === 'user' ? 'text-emerald-200/80' : 'text-slate-400/80'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isChatLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 max-w-[85%] mr-auto"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#042d24] to-[#043329] border border-[#c9a84c]/20 flex items-center justify-center text-white shadow-md">
                        <BrainCircuit size={17} className="text-[#c9a84c] animate-pulse" />
                      </div>
                      <div className="p-4 rounded-3xl bg-white dark:bg-slate-850 border border-slate-205 dark:border-slate-800 text-slate-500 rounded-tl-none flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-[#c9a84c] animate-spin" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#c9a84c] animate-pulse">
                          Superior Nexus AI is scanning database catalogs & formulating decisions...
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar - Premium Executive Dashboard Styling */}
              <form onSubmit={sendChatMessage} className="flex gap-3 relative items-stretch">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    placeholder="Ask any financial, academic, teacher timetables, student grades, or fees balances parameters..."
                    className="w-full pl-6 pr-32 py-4.5 text-xs md:text-sm rounded-2xl bg-white hover:bg-slate-50/50 focus:bg-white dark:bg-slate-950 dark:hover:bg-slate-950/80 border border-slate-200 focus:border-[#c9a84c] focus:ring-4 focus:ring-[#c9a84c]/10 focus:outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 font-extrabold shadow-xs transition-all duration-300"
                  />
                  
                  {chatInput.trim() && (
                    <button
                      type="button"
                      onClick={() => setChatInput("")}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-8 rounded-2xl bg-gradient-to-r from-[#042d24] to-[#0d4e40] dark:from-[#03241d] dark:to-[#0b4236] text-white font-extrabold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-xl hover:translate-y-[-2px] hover:border-[#c9a84c]/20 border border-transparent disabled:opacity-30 disabled:translate-y-0 disabled:hover:shadow-none"
                >
                  <Send size={14} className="text-[#c9a84c]" />
                  <span>Execute Lookup</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: BRAND STUDIO & NANO DESIGN LAB */}
          {activeTab === "brand" && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start animate-fadeIn w-full">
              
              {/* Left Settings Panel */}
              <div className="col-span-12 xl:col-span-5 flex flex-col bg-slate-50 dark:bg-slate-950/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-6">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <Palette size={16} className="text-[#c9a84c]" />
                    Real AI Graphic Designer
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold leading-relaxed">
                    Instruct Gemini Nano Banana 2 or Imagen to render completely custom, original posters, flyer designs, or rewards certificates. Uses <strong className="text-emerald-600 dark:text-emerald-400">Prompter AI</strong> to boost human input.
                  </p>
                </div>

                {/* CUSTOM INPUT AREA w/ UPLOAD */}
                <div className="flex flex-col flex-1">
                  <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1 flex justify-between items-center">
                    <span>1. Describe Your Desired Design</span>
                    {uploadedDesignBase64 && (
                      <button 
                        onClick={() => setUploadedDesignBase64(null)} 
                        className="text-[9px] text-red-500 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </label>
                  
                  {uploadedDesignBase64 && (
                    <div className="mb-2 p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg inline-block bg-white dark:bg-slate-900 shadow-sm relative">
                       <img src={uploadedDesignBase64} alt="Reference" className="h-14 w-auto rounded object-cover" />
                       <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold shadow">
                         Attached
                       </div>
                    </div>
                  )}

                  <div className="relative mb-2 flex-col flex flex-1">
                    <textarea
                      value={imageGenPrompt}
                      onChange={(e) => setImageGenPrompt(e.target.value)}
                      placeholder="e.g. Design a sports gala poster for boys campus with gold/green theme..."
                      className="w-full flex-1 min-h-[160px] p-3 pt-3 pr-10 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#c9a84c] text-slate-850 dark:text-slate-100 placeholder-slate-400 resize-y"
                    />
                    
                    <div className="absolute right-2 top-2">
                       <button
                         onClick={() => setShowUploadMenu(!showUploadMenu)}
                         className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-all border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 shadow-sm"
                         title="Upload Reference Design to Edit"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                       </button>

                       {showUploadMenu && (
                         <div className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg rounded-xl overflow-hidden z-20 animate-fadeIn">
                             <input 
                               type="file" 
                               accept="image/*" 
                               ref={fileInputRef}
                               style={{ display: 'none' }}
                               onChange={handleFileUpload} 
                             />
                             <button
                               onClick={() => { fileInputRef.current?.click(); }}
                               className="w-full text-left px-4 py-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer border-b border-slate-100 dark:border-slate-800"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                               Upload Image
                             </button>
                             <button
                               onClick={() => setShowUploadMenu(false)}
                               className="w-full text-left px-4 py-2 text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center cursor-pointer"
                             >
                               Cancel
                             </button>
                         </div>
                       )}
                    </div>
                  </div>

                  <button
                    onClick={handleEnhancePrompt}
                    disabled={isEnhancingPrompt || !imageGenPrompt.trim()}
                    className="w-full mb-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 disabled:opacity-50"
                  >
                    {isEnhancingPrompt ? (
                      <span className="animate-spin text-[#c9a84c]">🌀</span>
                    ) : (
                      <span>✨</span>
                    )}
                    {isEnhancingPrompt ? "Enhancing Prompt..." : "Enhance Prompt with AI"}
                  </button>

                  <label className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wider block mb-1">
                    2. AI Enhanced Prompt (Editable)
                  </label>
                  <textarea
                    value={enhancedDesignPrompt}
                    onChange={(e) => setEnhancedDesignPrompt(e.target.value)}
                    placeholder="Enhanced prompt will appear here and can be edited..."
                    className="w-full flex-1 min-h-[160px] p-3 text-xs font-medium rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-900 focus:outline-none focus:border-emerald-400 text-slate-800 dark:text-slate-100 resize-y"
                  />
                </div>

                {/* MODELS SELECTOR */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1.5">
                      Select AI Image Engine
                    </label>
                    <select
                      value={imageGenModel}
                      onChange={(e) => setImageGenModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#c9a84c]"
                    >
                      <option value="gemini-3.1-flash-image-preview">🍌 Nano Banana 2 (Gemini 3.1 Flash Image Preview)</option>
                      <option value="gemini-3-pro-image-preview">✨ Nano Banana Pro (Gemini 3 Pro Image Preview)</option>
                    </select>
                  </div>

                  {/* ASPECT RATIOS Selector */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1.5">
                      Visual Canvas Aspect Ratio
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "1:1", label: "1:1 Square" },
                        { id: "16:9", label: "16:9 Wide" },
                        { id: "9:16", label: "9:16 Tall" },
                        { id: "3:4", label: "3:4 Flyer" },
                        { id: "4:3", label: "4:3 Classic" },
                        { id: "3:2", label: "3:2 Medium" },
                        { id: "2:3", label: "2:3 Portrait" },
                        { id: "21:9", label: "21:9 Ultra" }
                      ].map((ar) => (
                        <button
                          key={ar.id}
                          onClick={() => setImageGenAspectRatio(ar.id as any)}
                          className={`p-2 rounded-xl border text-[9px] font-black uppercase text-center cursor-pointer transition-all ${
                            imageGenAspectRatio === ar.id
                              ? "bg-[#c9a84c] text-[#032d24] border-[#c9a84c] font-extrabold shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {ar.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* RENDER QUALITY Selector */}
                  <div className="mt-3">
                    <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-1.5">
                      Render Quality / Size
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "1K", label: "1K (Standard)" },
                        { id: "2K", label: "2K (High)" },
                        { id: "4K", label: "4K (Ultra)" }
                      ].map((q) => (
                        <button
                          key={q.id}
                          onClick={() => setImageGenQuality(q.id as any)}
                          className={`p-2 rounded-xl border text-[9px] font-black uppercase text-center cursor-pointer transition-all ${
                            imageGenQuality === q.id
                              ? "bg-[#c9a84c] text-[#032d24] border-[#c9a84c] font-extrabold shadow-sm"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  onClick={handleRealImageGeneration}
                  disabled={isGeneratingImage || !imageGenPrompt.trim()}
                  className="w-full py-3 bg-gradient-to-r from-[#032d24] to-superior-teal hover:to-[#085a4e] text-white font-black uppercase text-[11px] tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-45 mt-2"
                >
                  {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                  <span>Generate Final Design</span>
                </button>
              </div>

              {/* Right Media Image Canvas */}
              <div className="col-span-12 xl:col-span-7 flex flex-col items-center animate-fadeIn w-full">
                <div className="w-full mb-3 flex flex-wrap gap-2 justify-between items-center px-1">
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#c9a84c] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    Live AI Generated Design Center
                  </div>
                  
                  {generatedImageUrl ? (
                    <button
                      onClick={() => setDownloadModalOpen(true)}
                      className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-md rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <span>📥 Download Design Flyer</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center gap-1.5 cursor-not-allowed opacity-60"
                    >
                      <span>📥 Download Design Flyer</span>
                    </button>
                  )}
                </div>

                {/* Plain Render Space */}
                <div className={`w-full ${
                  isGeneratingImage 
                    ? "p-0 bg-transparent flex flex-col items-center justify-center border-none" 
                    : "p-4 bg-slate-50/40 dark:bg-slate-950/30 rounded-[2rem] border border-slate-200 dark:border-slate-800/85 flex flex-col items-center justify-center"
                } relative overflow-hidden w-full`} style={{ minHeight: "520px" }}>
                
                {isGeneratingImage ? (() => {
                  const stepDetails = getDynamicStepMessage();
                  return (
                    <div className="w-full max-w-lg p-8 bg-gradient-to-b from-slate-900 via-[#021f19] to-slate-950 rounded-[1.5rem] border border-emerald-500/20 shadow-2xl text-center space-y-6 flex flex-col items-center justify-center relative overflow-hidden">
                      {/* Tech Glow Effects */}
                      <div className="absolute top-0 left-1/4 w-40 h-40 bg-emerald-500/10 rounded-full filter blur-[40px] animate-pulse" />
                      <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-[#c9a84c]/5 rounded-full filter blur-[40px] animate-pulse" />

                      {/* Nexus AI Branding Icon */}
                      <div className="relative z-10">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#042d24] to-emerald-800 border-2 border-[#c9a84c]/40 flex items-center justify-center text-slate-100 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all">
                          <BrainCircuit size={42} className="text-[#c9a84c] animate-pulse" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-ping" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full" />
                      </div>

                      {/* Text Info */}
                      <div className="space-y-3 relative z-10 w-full">
                        <span className="text-[10px] font-black tracking-[0.3em] text-[#c9a84c] uppercase block">
                          SUPERIOR NEXUS AI • GRAPHIC CO-PILOT
                        </span>
                        <h4 className="text-lg font-black text-white uppercase tracking-wider">
                          Generating Custom Design Graphics...
                        </h4>
                        <p className="text-xs text-slate-400 font-extrabold uppercase leading-snug">
                          {imageGenModel} • Rendering {imageGenQuality} quality in {imageGenAspectRatio} aspect ratio
                        </p>
                      </div>

                      {/* Highly Premium status report with live Urdu descriptions requested by user */}
                      <div className="p-4 bg-emerald-950/40 rounded-2xl border border-emerald-800/30 text-left space-y-3 w-full backdrop-blur-md relative z-10">
                        <span className="text-[9px] font-black text-[#c9a84c] uppercase tracking-[0.2em] block border-b border-emerald-800/20 pb-1.5">
                          📋 Live Construction Status Report
                        </span>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
                            <span className="text-slate-200 font-bold">Current Stage:</span>
                            <span className="text-emerald-400 font-extrabold">{stepDetails.step}</span>
                          </div>
                          <div className="text-slate-350 leading-relaxed font-semibold">
                            ⚡ <span className="text-slate-100">{stepDetails.detail}</span>
                          </div>
                          <div className="text-amber-200 font-medium font-urdu text-[13.5px] leading-relaxed bg-[#03221b]/60 p-2.5 rounded-xl border border-emerald-800/20 italic text-right" dir="rtl">
                            {stepDetails.statusUrdu}
                          </div>
                        </div>
                      </div>

                      {/* Countdown Indicator */}
                      <div className="w-full max-w-lg space-y-3 relative z-10 bg-black/40 p-4 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 uppercase font-black">
                          <span>Superior Engine Process</span>
                          <span className="text-amber-300 animate-pulse font-extrabold tracking-wider">
                            {estimatedTime !== null ? `${estimatedTime}s remaining (${Math.min(100, Math.max(5, Math.round(((25 - estimatedTime) / 25) * 100)))}%)` : 'Initializing...'}
                          </span>
                        </div>
                        
                        {/* Simple dynamic bar where progress moves up based on remaining 25 seconds */}
                        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full bg-gradient-to-r from-superior-gold via-emerald-400 to-amber-300 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, Math.max(5, ((25 - (estimatedTime ?? 25)) / 25) * 100))}%` }}
                          />
                        </div>
                        
                        <div className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider text-center">
                          {stepDetails.techInfo}
                        </div>
                      </div>
                      
                      {/* Live parameters grid */}
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase font-black text-slate-400 w-full border-t border-slate-800/40 pt-4 relative z-10">
                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 flex justify-between">
                          <span className="text-slate-500">Model:</span>
                          <span className="text-slate-300">{imageGenModel.split("-")[0]}</span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 flex justify-between">
                          <span className="text-slate-500">Quality:</span>
                          <span className="text-emerald-400">{imageGenQuality} UHD</span>
                        </div>
                      </div>
                    </div>
                  );
                })() : generatedImageUrl ? (
                  <div className="w-full flex flex-col items-center space-y-5">
                    <div className={`relative overflow-hidden rounded-3xl border-2 border-[#c9a84c] shadow-2xl bg-black/5 ${
                      imageGenAspectRatio === "16:9" ? "aspect-video w-full" : 
                      imageGenAspectRatio === "9:16" ? "w-[280px] aspect-[9/16]" :
                      imageGenAspectRatio === "3:4" ? "w-[320px] aspect-[3/4]" :
                      imageGenAspectRatio === "4:3" ? "w-[400px] aspect-[4/3] max-w-full" :
                      imageGenAspectRatio === "3:2" ? "w-[400px] aspect-[3/2] max-w-full" :
                      imageGenAspectRatio === "2:3" ? "w-[280px] aspect-[2/3]" :
                      imageGenAspectRatio === "21:9" ? "w-full aspect-[21/9]" :
                      "max-w-[400px] aspect-square w-full"
                    }`}>
                      <img
                        src={generatedImageUrl}
                        alt="SGC AI Custom Design Content"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain select-none"
                      />
                      {/* Branded Watermark overlay with Quality size info badge */}
                      <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10 text-[9px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span>⚡ DESIGNED BY SUPERIOR NEXUS AI</span>
                        <span className="bg-[#c9a84c]/20 text-[#c9a84c] text-[8.5px] font-black px-1.5 py-0.5 rounded border border-[#c9a84c]/30">{imageGenQuality}</span>
                      </div>
                    </div>

                    {/* 4 PREVIEWS GRID (DIFFERENT DESIGNS ASPECT) */}
                    {designOptions.length > 0 && (
                      <div className="w-full max-w-lg">
                        <label className="text-[9px] text-[#c9a84c] uppercase font-black tracking-widest block mb-2 text-center">
                          ✨ Core Design Style Options (Click to Swap Main Preview & Export)
                        </label>
                        <div className="grid grid-cols-4 gap-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm">
                          {designOptions.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => {
                                      setGeneratedImageUrl(opt.url);
                                      setSpeechFeedback(`Swapped main view to Design Style ${oIdx + 1}`);
                              }}
                              className={`relative rounded-xl overflow-hidden border-2 aspect-square group transition-all cursor-pointer ${
                                generatedImageUrl === opt.url 
                                  ? "border-[#c9a84c] shadow-md scale-105 bg-[#c9a84c]/10" 
                                  : "border-slate-200 dark:border-slate-850 hover:border-slate-400 bg-slate-100/50"
                              }`}
                            >
                              <img
                                src={opt.url}
                                alt={`Design Option ${oIdx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute bottom-1 right-1 bg-black/80 text-[7px] font-black tracking-wider text-white px-1 py-0.5 rounded-sm uppercase">
                                Style {oIdx + 1}
                              </div>
                              {generatedImageUrl === opt.url && (
                                <div className="absolute inset-x-0 top-0 bg-[#c9a84c] text-slate-950 font-black text-[7px] uppercase py-0.5 text-center tracking-wider leading-none">
                                  Active
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Info Banner */}
                    <div className="bg-white dark:bg-slate-900 border p-3.5 rounded-2xl w-full max-w-lg text-center shadow-sm">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Generated Prompt Context</span>
                      <blockquote className="text-[10.5px] italic text-slate-600 dark:text-slate-350 font-semibold line-clamp-2">
                        "{imageGenPrompt}"
                      </blockquote>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6 max-w-md p-8 bg-slate-100/55 dark:bg-slate-950/25 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center relative min-h-[460px] w-full">
                    {/* Crosshair corners to look like a premium graphic editor target */}
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-400 dark:border-slate-700" />
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-400 dark:border-slate-700" />
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-slate-400 dark:border-slate-700" />
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-slate-400 dark:border-slate-700" />

                    <div className="w-16 h-16 bg-gradient-to-tr from-[#032d24] to-emerald-800 border-2 border-[#c9a84c]/50 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-all">
                      <Palette size={32} className="text-[#c9a84c] animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-black tracking-[0.25em] text-[#c9a84c] uppercase block">
                        Superior Nexus AI • Studio Preview
                      </span>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        Real-Time Graphic Engine Ready
                      </h4>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto font-semibold leading-relaxed">
                        No templates used! Type your customized prompt, adjust options on the left, and click <strong className="text-[#c9a84c]">Generate Final Design</strong> to render custom SGC branding flyers.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mt-2">
                      {[
                        "Sports Gala",
                        "Mehfil e Hamd",
                        "Admissions Open Logo",
                        "Position Holder Poster"
                      ].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => {
                            setImageGenPrompt(preset);
                            setEnhancedDesignPrompt(preset + " at Superior Group of Colleges Jahanian Campus, high detail, premium executive graphics.");
                          }}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] font-black text-slate-600 dark:text-slate-400 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-all shadow-2xs"
                        >
                          ⚡ "{preset}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Display validation error if any occurs */}
                {imageGenError && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-rose-600 dark:text-rose-450 text-xs text-center max-w-md font-bold">
                    ⚠️ <strong>AI Gen Error:</strong> {imageGenError}
                  </div>
                )}
                </div>

                {/* SESSIONS HISTORY / GALLERY */}
                {imageGallery.length > 0 && (
                  <div className="w-full mt-6">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-455 block mb-2.5">
                      📸 Session Design History (Click to swap or review)
                    </span>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {imageGallery.map((imgUrl, gIdx) => (
                        <button
                          key={gIdx}
                          onClick={() => {
                            setGeneratedImageUrl(imgUrl);
                            setSpeechFeedback("Restored previously generated design.");
                          }}
                          className={`w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0 cursor-pointer active:scale-95 transition-all ${
                            generatedImageUrl === imgUrl ? "ring-2 ring-amber-500 border-transparent shadow-lg" : ""
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Gallery item ${gIdx}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}


          {/* TAB 3: EXECUTIVE SWOT DECISION LAB */}
          {activeTab === "swot" && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                      📋 High-level strategic SWOT auditing
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Choose an administrative focus scope to compute specialized AI diagnostic action plans
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { id: "financial", label: "Fiscal Cost SWOT", color: "text-[#c9a84c]" },
                      { id: "performance", label: "Academic Strengths", color: "text-superior-teal" },
                      { id: "general", label: "3-Month Admin Outlook", color: "text-blue-500" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => runStrategicAnalysis(btn.id as any)}
                        className="px-3.5 py-1.5 rounded-xl border text-[11px] font-black uppercase cursor-pointer hover:bg-[#c9a84c]/5 hover:border-[#c9a84c]/50 transition-all text-slate-600 dark:text-slate-400 active:scale-95 shadow-sm"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audit outputs view */}
                <div className="min-h-[350px] relative">
                  {isAnalysisLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/50">
                      <Loader2 className="w-10 h-10 text-superior-gold animate-spin mb-3.5" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#c9a84c] animate-pulse">Running SWOT Audit Engine...</span>
                    </div>
                  ) : analysisOutput ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#c9a84c]">
                          AI ANALYSIS OUTCOMES & INITIATIVES
                        </span>
                        <button
                          onClick={() => handleCopy(analysisOutput, "swot")}
                          className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 flex items-center gap-1.5 rounded-lg transition-all"
                        >
                          {copiedSection === "swot" ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                          <span>{copiedSection === "swot" ? "Strategic Plan Copied!" : "Copy Strategic Plan"}</span>
                        </button>
                      </div>
                      
                      <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium space-y-3 whitespace-pre-wrap max-h-[400px] overflow-auto">
                        {analysisOutput}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center text-slate-400">
                       <Activity size={30} className="text-slate-350 dark:text-slate-705 mb-2" />
                       <span className="text-xs font-black uppercase tracking-widest block text-slate-400">SWOT AUDIT LAB READY</span>
                       <span className="text-[10px] opacity-75 mt-0.5 leading-snug max-w-sm">
                         Click any of the SWOT focal selectors above or speak "SWOT Analysis" to trigger automatic institutional forecasts.
                       </span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: CIRCULARS & BROADCASTS COMPOSER */}
          {activeTab === "notices" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Notice configurators Left - 5 Spans */}
              <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-950/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-850 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                   Broadcast Notice Settings
                </h4>
                
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Announcement Goal</label>
                  <div className="grid grid-cols-3 gap-1 mt-1.5">
                    {[
                      { val: "fee_default", label: "Fee Default" },
                      { val: "low_attendance", label: "Late / Absent" },
                      { val: "ptm", label: "PTM Convocation" },
                    ].map((bt) => (
                      <button
                        key={bt.val}
                        onClick={() => setNoticeType(bt.val)}
                        className={`py-2 text-[10px] font-black uppercase text-center rounded-xl border transition-all cursor-pointer ${
                          noticeType === bt.val
                            ? "bg-superior-teal border-superior-teal text-white"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400">Target Date / Day</label>
                    <input
                      type="text"
                      value={extraParams.deadlineDate}
                      onChange={(e) => setExtraParams(p => ({ ...p, deadlineDate: e.target.value }))}
                      className="w-full mt-1 p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {noticeType === "fee_default" ? (
                    <>
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400">Disciplinary Penalty</label>
                        <input
                          type="text"
                          value={extraParams.penaltyAmount}
                          onChange={(e) => setExtraParams(p => ({ ...p, penaltyAmount: e.target.value }))}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-black text-slate-400">Installment Waivers Allowed?</label>
                        <select
                          value={extraParams.installmentAllowed}
                          onChange={(e) => setExtraParams(p => ({ ...p, installmentAllowed: e.target.value }))}
                          className="w-full mt-1 p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          <option value="Yes">Yes, file case at campus block</option>
                          <option value="No">No installment option available</option>
                        </select>
                      </div>
                    </>
                  ) : noticeType === "low_attendance" ? (
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-400">Min Attendance Cap</label>
                      <input
                        type="text"
                        value={extraParams.attendanceThreshold}
                        onChange={(e) => setExtraParams(p => ({ ...p, attendanceThreshold: e.target.value }))}
                        className="w-full mt-1 p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] uppercase font-black text-slate-400">PTM Scheduled Time</label>
                      <input
                        type="text"
                        value={extraParams.parentMeetingTime}
                        onChange={(e) => setExtraParams(p => ({ ...p, parentMeetingTime: e.target.value }))}
                        className="w-full mt-1 p-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={composeAIVariantNotice}
                  disabled={isNoticeLoading}
                  className="w-full py-3 bg-superior-gold text-slate-950 font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
                >
                  {isNoticeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles size={13} />}
                  Draft Circular Notice
                </button>
              </div>

              {/* Compose outputs view Right - 8 Spans */}
              <div className="lg:col-span-8 bg-slate-55 rounded-3xl space-y-4">
                {isNoticeLoading ? (
                  <div className="h-64 border rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/40">
                    <Loader2 className="w-10 h-10 text-superior-teal animate-spin mb-2" />
                    <span className="text-xs font-black uppercase tracking-wider text-superior-teal animate-pulse">Drafting Circular model notices...</span>
                  </div>
                ) : composedNotice ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#085a4e]">
                         READY BROADSHEET LETTER & SMS TEMPLATES
                      </span>
                      <button
                        onClick={() => handleCopy(composedNotice, "notices")}
                        className="px-3.5 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-350 flex items-center gap-1.5 rounded-lg transition-all"
                      >
                        {copiedSection === "notices" ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        <span>{copiedSection === "notices" ? "Templates Copied!" : "Copy Broadcast Texts"}</span>
                      </button>
                    </div>

                    <pre className="text-xs font-mono font-bold leading-relaxed whitespace-pre-wrap text-slate-750 dark:text-slate-250 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 max-h-[450px] overflow-auto">
                      {composedNotice}
                    </pre>

                    <div className="p-3 bg-[#085a4e]/5 border border-[#085a4e]/20 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      💡 <strong>Super Admin Broadcaster Note:</strong> Copy and dispatch these templates directly targeting Whatsapp, custom parent circulars, notice boards, or bulk SMS gateways.
                    </div>
                  </div>
                ) : (
                  <div className="h-64 border border-dashed border-slate-250 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center text-slate-400 py-12">
                     <Megaphone size={30} className="text-slate-350 dark:text-slate-705 mb-2 animate-pulse" />
                     <span className="text-xs font-black uppercase tracking-widest">Composer Terminal Ready</span>
                     <span className="text-[10px] opacity-75 mt-0.5 max-w-sm">
                       Configure criteria on the left sidebar & trigger generation to compose parent alerts and English draft directives.
                     </span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* DOWNLOAD RESOLUTION OPTION MODAL OVERLAY */}
        <AnimatePresence>
          {downloadModalOpen && (
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Select Export Resolution
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                      Superior Branding Center Professional Export
                    </p>
                  </div>
                  <button 
                    onClick={() => setDownloadModalOpen(false)}
                    className="w-7 h-7 bg-slate-150 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 rounded-full flex items-center justify-center cursor-pointer transition-colors text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Preview mini image */}
                {generatedImageUrl && (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-150 dark:border-slate-800 bg-slate-100">
                    <img 
                      src={generatedImageUrl} 
                      alt="Selected Option preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">
                      Current: {imageGenAspectRatio}
                    </div>
                  </div>
                )}

                {/* Loading status overlay if upscaling */}
                {isUpgradingResolution ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-[#c9a84c] animate-spin" />
                    <p className="text-xs font-mono font-black text-[#c9a84c] animate-pulse text-center">
                      AI is rendering and upscaling your master design with pristine vector elements...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {[
                      { id: "1K", title: "1K (Standard HD - 1024px)", desc: "Perfect for quick social sharing, WhatsApp statuses, and digital chats.", badge: "Instant Download" },
                      { id: "2K", title: "2K (Quad HD - 2048px)", desc: "Excellent sharpness. Suited for official notices & modern web displays.", badge: "HD Upgrade" },
                      { id: "4K", title: "4K (Ultra HD - 4096px)", desc: "Epic commercial print level. Zero pixelation on large banners or displays.", badge: "Commercial Print" }
                    ].map((res) => (
                      <button
                        key={res.id}
                        onClick={() => handleUpgradeAndDownload(res.id as "1K" | "2K" | "4K")}
                        className="w-full text-left p-3.5 rounded-2xl border border-slate-150 dark:border-slate-850 hover:border-[#c9a84c] bg-slate-50 hover:bg-[#c9a84c]/5 dark:bg-slate-900/40 dark:hover:bg-[#c9a84c]/5 transition-all flex items-center justify-between cursor-pointer group active:scale-[0.99]"
                      >
                        <div className="space-y-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                              {res.title}
                            </span>
                            <span className="text-[7px] font-black uppercase text-slate-400 border px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 shadow-xs">
                              {res.badge}
                            </span>
                          </div>
                          <p className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold leading-relaxed">
                            {res.desc}
                          </p>
                        </div>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs">
                          →
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider">
                  ⚡ Powered by high-fidelity deep neural rendering engines
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* BOTTOM EXECUTIVES STATS STRIP */}
        <div className="px-6 py-4 md:px-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Total Strength</span>
            <span className="text-sm md:text-md font-extrabold text-slate-800 dark:text-white">{collegeContext.studentCount || "N/A"} Students</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Workforce Staff</span>
            <span className="text-sm md:text-md font-extrabold text-[#c9a84c]">{collegeContext.staffCount || "N/A"} Core Teachers</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Pending Fees Dues</span>
            <span className="text-sm md:text-md font-extrabold text-red-500">Rs. {(collegeContext.outstandingDues || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Monthly Wages Pay</span>
            <span className="text-sm md:text-md font-extrabold text-slate-800 dark:text-white">Rs. {(collegeContext.staffWageLiability || 0).toLocaleString()}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 pt-2 sm:pt-0">
            <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Board Core Session</span>
            <span className="text-sm md:text-md font-extrabold text-superior-teal uppercase">{collegeContext.session || "N/A"}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
