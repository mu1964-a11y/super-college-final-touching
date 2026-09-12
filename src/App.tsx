import React, { useState, useMemo } from "react";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  GraduationCap,
  Briefcase,
  Wallet,
  FileText,
  ChevronDown,
  Menu,
  School,
  X,
  CreditCard,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  Zap,
  Database,
  LogOut,
  BookOpen,
  Award,
  Calendar,
  Home,
  Layers,
  Sparkles,
  Mail,
  Lock,
  UserCheck,
  LogIn,
  Key,
  MessageCircle,
  Phone,
  User as UserIcon,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Check,
  Clock,
  QrCode,
  Star,
  Activity,
  Wifi,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSupabaseData } from "./hooks/useSupabaseData";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { safeLocalStorage } from "./utils/safeStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import DashboardView from "./components/DashboardView";

import AdmissionsView from "./components/AdmissionsView";
import StudentsView from "./components/StudentsView";
import StaffView from "./components/StaffView";
import AccountsView from "./components/AccountsView";
import ReportsView from "./components/ReportsView";
import LeadsManagementView from "./components/LeadsManagementView";
import FeeManagementView from "./components/FeeManagementView";
import AttendanceView from "./components/AttendanceView";
import SettingsView from "./components/SettingsView";
import AcademicView from "./components/AcademicView";
import WhatsAppCenterView from "./components/WhatsAppCenterView";
import GlobalCommandPalette from "./components/GlobalCommandPalette";
import StudentDossier360 from "./components/StudentDossier360";
import PublicVerificationView from "./components/PublicVerificationView";
import StudentPortal from "./components/StudentPortal";
import StaffPortal from "./components/StaffPortal";
import PortalGatewayView from "./components/PortalGatewayView";
import WelcomeScreen from "./components/WelcomeScreen";
import AcademicCanvasBackground from "./components/AcademicCanvasBackground";
import PortalAuthCard from "./components/PortalAuthCard";
import { Search } from "lucide-react";

import { Settings as SettingsIcon } from "lucide-react";
import AccessControlDialog from "./components/AccessControl";
import NotificationPanel from "./components/NotificationPanel";

type Page =
  | "dashboard"
  | "admissions"
  | "admissions-fsc"
  | "admissions-ukl3"
  | "admissions-dit"
  | "admissions-bs"
  | "fee"
  | "fee-boys"
  | "fee-girls"
  | "fee-ukl3"
  | "fee-dit"
  | "fee-bs"
  | "students"
  | "students-boys"
  | "students-girls"
  | "students-ukl3"
  | "students-dit"
  | "students-bs"
  | "attendance"
  | "staff"
  | "accounts"
  | "reports"
  | "leads"
  | "settings"
  | "library"
  | "academic"
  | "classes"
  | "timetable"
  | "whatsapp-center";

const NavSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mt-4 mb-2">
    <div className="px-5 mb-1.5">
      <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest font-mono">
        {title}
      </h3>
    </div>
    <div className="space-y-[1px] px-2">{children}</div>
  </div>
);

const NavItem = ({
  id,
  label,
  icon: Icon,
  subItems,
  expandedMenu,
  activePage,
  activeFilter,
  onToggleMenu,
  onNavClick,
}: {
  id: string;
  label: string;
  icon: any;
  subItems?: { id: Page; label: string; filter?: string }[];
  expandedMenu: string | null;
  activePage: Page;
  activeFilter: string | null;
  onToggleMenu?: (id: string) => void;
  onNavClick?: (
    id: Page,
    filter?: string | null,
    parentMenu?: string | null,
  ) => void;
}) => {
  const isExpanded = expandedMenu === id;
  const isActive =
    activePage === id || subItems?.some((s) => s.id === activePage);

  return (
    <div className="w-full">
      <button
        onClick={() => {
          if (subItems && onToggleMenu) onToggleMenu(id);
          else if (onNavClick) onNavClick(id as Page, null, null);
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-[7px] rounded-lg transition-colors group relative overflow-hidden",
          isActive
            ? "bg-superior-gold/10 text-white"
            : "text-white/60 hover:bg-white/5 hover:text-white",
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-superior-gold rounded-r-md" />
        )}
        <div className="flex items-center gap-3 relative z-10 w-full">
          <Icon 
            size={16} 
            strokeWidth={isActive ? 2.5 : 2}
            className={cn(
              "transition-colors flex-shrink-0 ml-1",
              isActive ? "text-superior-gold" : "text-white/40 group-hover:text-white/80"
            )}
          />
          <span className={cn(
            "text-[12px] transition-all tracking-normal text-left truncate flex-1",
            isActive ? "font-semibold text-superior-gold" : "font-medium"
          )}>{label}</span>
        </div>
        {subItems && (
          <div
            className={cn(
              "transition-transform duration-200 relative z-10 flex-shrink-0 ml-2",
              isExpanded ? "rotate-180 text-superior-gold" : "opacity-40 group-hover:opacity-100",
            )}
          >
            <ChevronDown size={14} />
          </div>
        )}
      </button>

      <AnimatePresence>
        {subItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden relative"
          >
            <div className="absolute left-[20px] top-0 bottom-2 w-[1px] bg-white/10" />
            <div className="py-1 flex flex-col gap-0.5 pl-[14px]">
              {subItems.map((sub, idx) => {
                const isSubActive = activePage === sub.id && (activeFilter === sub.filter || (!activeFilter && !sub.filter));
                return (
                  <button
                    key={`${sub.id}-${idx}`}
                    onClick={() => onNavClick && onNavClick(sub.id, sub.filter, id)}
                    className={cn(
                      "w-full text-left pl-6 pr-3 py-1.5 rounded-lg text-[11px] transition-colors relative group/sub tracking-wide",
                      isSubActive
                        ? "text-superior-gold font-medium bg-superior-gold/5"
                        : "text-white/50 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <div className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] transition-colors",
                      isSubActive ? "bg-superior-gold" : "bg-white/10 group-hover/sub:bg-white/30"
                    )} />
                    {sub.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [hideLedgerAlert, setHideLedgerAlert] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingCountdown, setLoadingCountdown] = useState(5);
  const [isBrandingLoaded, setIsBrandingLoaded] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [email, setEmail] = useState(() => safeLocalStorage.getItem('scj_remembered_email') || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!safeLocalStorage.getItem('scj_remembered_email'));
  const [loginError, setLoginError] = useState("");
  const [portalSession, setPortalSession] = useState<{ type: 'student' | 'staff'; data: any } | null>(() => {
    try {
      const saved = safeLocalStorage.getItem('scj_portal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginPortal, setLoginPortal] = useState<'admin' | 'student' | 'staff'>('student');
  const [portalViewMode, setPortalViewMode] = useState<'welcome' | 'gateway' | 'login'>('welcome');
  const [studentIdInput, setStudentIdInput] = useState("");
  const [studentPhoneInput, setStudentPhoneInput] = useState("");
  const [staffIdInput, setStaffIdInput] = useState("");
  const [staffPassInput, setStaffPassInput] = useState("");
  const [brandingSettings, setBrandingSettings] = useState<{
    name: string;
    logo: string | null;
  }>(() => {
    const savedLogo = safeLocalStorage.getItem('college_logo');
    const savedName = safeLocalStorage.getItem('college_name');
    return {
      name: savedName || "Superior College",
      logo: savedLogo || null,
    };
  });

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [dossierStudent, setDossierStudent] = useState<any | null>(null);

  // Global Ctrl+K / Cmd+K keyboard shortcut listener for Spotlight Search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  // Dark mode init
  React.useEffect(() => {
    const savedTheme = safeLocalStorage.getItem("theme");

    if (savedTheme === "dark" || (!savedTheme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      safeLocalStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      safeLocalStorage.setItem("theme", "light");
    }
    
    // Listen for custom themechange event
    const handleThemeChange = () => {}; // Dummy to keep state updated, actually we don't need react state since we read DOM directly, but could trigger a re-render if we used state.
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  // Fetch branding even before login
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsBrandingLoaded(true);
      return;
    }
    const fetchBranding = async () => {
      try {
        // Try to get the settings record
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) {
          const errMsg = error.message || String(error);
          if (errMsg.toLowerCase().includes("refresh token") || errMsg.toLowerCase().includes("refresh_token")) {
            console.warn("Detected invalid refresh token in branding fetch. Clearing auth session.");
            safeLocalStorage.removeItem("scj-auth");
            supabase.auth.signOut({ scope: "local" }).catch(() => {});
            window.location.reload();
            return;
          }
          console.warn("Branding fetch query error:", error);
          return;
        }

        if (data) {
          const logoSource =
            data.logo_url ||
            data.logo ||
            data.config?.logo ||
            data.config?.logo_url;
            
          const finalName = data.college_name || data.name || "Superior College";
          setBrandingSettings({
            name: finalName,
            logo: logoSource || null,
          });
          
          if (logoSource) safeLocalStorage.setItem('college_logo', logoSource);
          safeLocalStorage.setItem('college_name', finalName);

          // Debugging help - if logo is still not showing but we have data
          if (!logoSource) {
            console.warn("Settings found but no logo source identified:", data);
          }
        } else {
          console.log("No branding settings record found in database.");
        }
      } catch (err) {
        const errMsg = typeof err === 'string' ? err : (err as any)?.message || String(err);
        if (errMsg.toLowerCase().includes("refresh token") || errMsg.toLowerCase().includes("refresh_token")) {
          console.warn("Detected invalid refresh token in branding fetch catch block. Clearing auth session.");
          safeLocalStorage.removeItem("scj-auth");
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
          window.location.reload();
          return;
        }
        console.warn("Branding fetch fatal error:", err);
      } finally {
        setIsBrandingLoaded(true);
      }
    };
    fetchBranding();
  }, []);

  // Standard session handling without auto-logout as requested
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then((response) => {
        const { data, error } = response;
        if (error) {
          const errMsg = typeof error === 'string' ? error : (error.message || String(error));
          const lowerMsg = errMsg.toLowerCase();
          if (lowerMsg.includes("refresh token") || lowerMsg.includes("refresh_token") || lowerMsg.includes("session_not_found") || lowerMsg.includes("invalid_grant")) {
            safeLocalStorage.removeItem("scj-auth");
            // Also remove the generic supabase storage items if any exist
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('supabase') || key.includes('scj-auth') || key.includes('sb-'))) {
                localStorage.removeItem(key);
              }
            }
            supabase.auth.signOut({ scope: "local" }).catch(() => {});
            window.location.reload();
          } else {
            console.error("Session error:", error);
          }
        }
        setUser(data?.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        const errMsg = typeof err === 'string' ? err : (err?.message || String(err));
        const lowerMsg = errMsg.toLowerCase();
        if (lowerMsg.includes("refresh token") || lowerMsg.includes("refresh_token") || lowerMsg.includes("session_not_found") || lowerMsg.includes("invalid_grant")) {
          safeLocalStorage.removeItem("scj-auth");
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('scj-auth') || key.includes('sb-'))) {
              localStorage.removeItem(key);
            }
          }
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
          window.location.reload();
        } else {
          console.warn("Got session error:", err);
        }
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        setUser(session?.user ?? null);
      } else {
        setUser((prev) =>
          prev?.id === session?.user?.id && prev
            ? prev
            : (session?.user ?? null),
        );
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) {
      setShowLoginForm(true);
    } else {
      setShowLoginForm(false);
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    const loginEmail = email.trim().toLowerCase();
    const loginPassword = password;

    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter both email and password.\nMeharbani farma kar email aur password dono likhein.");
      setAuthLoading(false);
      return;
    }

    // Step 1: Verify on backend if email exists
    try {
      const checkRes = await fetch(`/api/check-email?email=${encodeURIComponent(loginEmail)}`);
      const checkData = await checkRes.json();

      if (!checkData.exists) {
        setLoginError("❌ Incorrect Username / Email (No such registered user)\nYe email / username ghalat hai. Is naam ka koi sub-admin system mein register nahi hai.");
        setAuthLoading(false);
        return;
      }
    } catch (checkErr) {
      console.warn("Email exists pre-verification failed, processing login directly:", checkErr);
    }

    // Step 2: Proceed with standard authentication
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("invalid login credentials") || errMsg.includes("invalid_credentials") || errMsg.includes("incorrect")) {
        setLoginError("❌ Incorrect Password (Password Ghalat Hai)\nApka email/username bilkul theek hai, lekin password ghalat hai. Dubara check kar ke likhein.");
      } else {
        setLoginError(`❌ Authentication Failed:\n${error.message}`);
      }
      setAuthLoading(false);
    } else {
      if (rememberMe) {
        safeLocalStorage.setItem('scj_remembered_email', loginEmail);
      } else {
        safeLocalStorage.removeItem('scj_remembered_email');
      }
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear AI Copilot persistent state
      safeLocalStorage.keys().forEach(key => {
        if (key.startsWith("scj_ai_")) {
          safeLocalStorage.removeItem(key);
        }
      });
      const { error } = await supabase.auth.signOut();
      if (error) {
        const errMsg = typeof error === 'string' ? error : (error.message || String(error));
        if (errMsg.toLowerCase().includes("refresh token") || errMsg.toLowerCase().includes("refresh_token")) {
          safeLocalStorage.removeItem("scj-auth");
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          window.location.reload();
          return;
        }
      }
    } catch (e) {
      console.warn("Logout warning:", e);
    }
    toast.info("Logged out successfully");
  };

  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(true);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [selectedSession, setSelectedSession] = useState("all");

  const effectiveUser = user || (portalSession ? { id: `portal-${portalSession.type}-${portalSession.data?.id || 'session'}` } : null);
  const data = useSupabaseData(effectiveUser);

  const handleStudentPortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    const rawId = studentIdInput.trim().toLowerCase();
    const rawCred = studentPhoneInput.trim().toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawCred) {
      setLoginError("Please enter your Student Roll No / ID and Registered Mobile Number.\nMeharbani farma kar apna Roll No / ID aur registered mobile number darj karein.");
      setAuthLoading(false);
      return;
    }

    try {
      // 1. Try local list if available
      let matchedStudent = (data.students || []).find((s) => {
        const sId = (s.id || "").toLowerCase();
        const sRoll = (s.rollNo || "").toLowerCase();
        const sCollegeNo = (s.collegeNo || "").toLowerCase();
        const sBForm = (s.bayFormNo || "").replace(/\D/g, "");
        const sName = (s.fullName || "").toLowerCase();
        const sBoard = (s.boardRollNo || "").toLowerCase();

        const idMatch = sId === rawId || sRoll === rawId || sCollegeNo === rawId || sBForm === rawId.replace(/\D/g, "") || sBoard === rawId || sName === rawId;
        if (!idMatch) return false;

        const contacts = [
          (s.contact || "").replace(/[\s-]/g, "").toLowerCase(),
          (s.fatherContact || "").replace(/[\s-]/g, "").toLowerCase(),
          (s.secondaryContact || "").replace(/[\s-]/g, "").toLowerCase(),
        ].filter(Boolean);

        const dob = (s.dob || "").replace(/[\s-]/g, "").toLowerCase();
        const firstName = (s.fullName || "").split(" ")[0].toLowerCase();

        return contacts.some(c => c.includes(rawCred) || rawCred.includes(c) || (rawCred.length >= 4 && c.endsWith(rawCred))) ||
               dob === rawCred ||
               firstName === rawCred;
      });

      // 2. If not found in memory, query Supabase directly
      if (!matchedStudent && isSupabaseConfigured) {
        const { data: dbStudents, error } = await supabase
          .from('students')
          .select('*');

        if (!error && dbStudents && dbStudents.length > 0) {
          const found = dbStudents.find((s: any) => {
            const sId = (s.id || "").toLowerCase();
            const sRoll = (s.roll_no || "").toLowerCase();
            const sCollegeNo = (s.college_no || "").toLowerCase();
            const sBForm = (s.bay_form_no || "").replace(/\D/g, "");
            const sName = (s.full_name || "").toLowerCase();
            const sBoard = (s.board_roll_no || "").toLowerCase();

            const idMatch = sId === rawId || sRoll === rawId || sCollegeNo === rawId || sBForm === rawId.replace(/\D/g, "") || sBoard === rawId || sName === rawId;
            if (!idMatch) return false;

            const contacts = [
              (s.contact || s.contact_number || "").replace(/[\s-]/g, "").toLowerCase(),
              (s.father_contact || "").replace(/[\s-]/g, "").toLowerCase(),
              (s.secondary_contact || "").replace(/[\s-]/g, "").toLowerCase(),
            ].filter(Boolean);

            const dob = (s.dob || "").replace(/[\s-]/g, "").toLowerCase();
            const firstName = (s.full_name || "").split(" ")[0].toLowerCase();

            return contacts.some(c => c.includes(rawCred) || rawCred.includes(c) || (rawCred.length >= 4 && c.endsWith(rawCred))) ||
                   dob === rawCred ||
                   firstName === rawCred;
          });

          if (found) {
            matchedStudent = {
              ...found,
              fullName: found.full_name,
              fatherName: found.father_name,
              rollNo: found.roll_no,
              collegeNo: found.college_no,
              bayFormNo: found.bay_form_no,
              boardRollNo: found.board_roll_no,
              contact: found.contact,
              fatherContact: found.father_contact,
              secondaryContact: found.secondary_contact,
              admissionFee: found.admission_fee,
              totalPackage: found.total_package,
              totalFeeFinalized: found.total_fee_finalized,
              feeReceived: found.fee_received,
              academicPart: found.academic_part || 'Part-1',
              session: found.session,
              feeLedger: found.fee_ledger,
              feeHistory: found.fee_history
            };
          }
        }
      }

      if (matchedStudent) {
        const sessionObj = { type: 'student' as const, data: matchedStudent };
        safeLocalStorage.setItem('scj_portal_user', JSON.stringify(sessionObj));
        setPortalSession(sessionObj);
        toast.success(`Welcome to Student Portal, ${matchedStudent.fullName || 'Student'}!`);
        setAuthLoading(false);
        return;
      }

      setLoginError("❌ Student Record Not Found or Credentials Mismatch.\nApka Roll No / ID ya Mobile number match nahi ho raha. Meharbani farma kar apna Roll No aur college mein diya gaya phone number check karein.");
      setAuthLoading(false);
    } catch (err: any) {
      setLoginError(`❌ Verification error: ${err?.message || 'Server connection error'}`);
      setAuthLoading(false);
    }
  };

  const handleStaffPortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");

    const rawId = staffIdInput.trim().toLowerCase();
    const rawCred = staffPassInput.trim().toLowerCase().replace(/[\s-]/g, "");

    if (!rawId || !rawCred) {
      setLoginError("Please enter your Staff ID / Name and CNIC / Phone Number.\nMeharbani farma kar apna Staff ID aur CNIC ya phone number likhein.");
      setAuthLoading(false);
      return;
    }

    try {
      // 1. Try local list first
      let matchedStaff = (data.staff || []).find((st) => {
        const stId = (st.id || "").toLowerCase();
        const stName = (st.fullName || "").toLowerCase();

        const idMatch = stId === rawId || stName.includes(rawId) || rawId.includes(stName);
        if (!idMatch) return false;

        const stCnic = (st.cnic || "").replace(/[\s-]/g, "").toLowerCase();
        const stPhone = (st.contact || "").replace(/[\s-]/g, "").toLowerCase();

        return (stCnic && (stCnic.includes(rawCred) || rawCred.includes(stCnic) || (rawCred.length >= 4 && stCnic.endsWith(rawCred)))) ||
               (stPhone && (stPhone.includes(rawCred) || rawCred.includes(stPhone) || (rawCred.length >= 4 && stPhone.endsWith(rawCred))));
      });

      // 2. Query Supabase directly if not in memory
      if (!matchedStaff && isSupabaseConfigured) {
        const { data: dbStaff, error } = await supabase
          .from('staff')
          .select('*');

        if (!error && dbStaff && dbStaff.length > 0) {
          const found = dbStaff.find((st: any) => {
            const stId = (st.id || "").toLowerCase();
            const stName = (st.full_name || "").toLowerCase();

            const idMatch = stId === rawId || stName.includes(rawId) || rawId.includes(stName);
            if (!idMatch) return false;

            const stCnic = (st.cnic || "").replace(/[\s-]/g, "").toLowerCase();
            const stPhone = (st.contact || "").replace(/[\s-]/g, "").toLowerCase();

            return (stCnic && (stCnic.includes(rawCred) || rawCred.includes(stCnic) || (rawCred.length >= 4 && stCnic.endsWith(rawCred)))) ||
                   (stPhone && (stPhone.includes(rawCred) || rawCred.includes(stPhone) || (rawCred.length >= 4 && stPhone.endsWith(rawCred))));
          });

          if (found) {
            matchedStaff = {
              ...found,
              fullName: found.full_name,
              photo: found.photo_url || found.photo,
              salary: found.salary,
              contact: found.contact,
              cnic: found.cnic,
              role: found.role,
              designation: found.designation
            };
          }
        }
      }

      if (matchedStaff) {
        const sessionObj = { type: 'staff' as const, data: matchedStaff };
        safeLocalStorage.setItem('scj_portal_user', JSON.stringify(sessionObj));
        setPortalSession(sessionObj);
        toast.success(`Welcome to Faculty Portal, ${matchedStaff.fullName || 'Professor'}!`);
        setAuthLoading(false);
        return;
      }

      setLoginError("❌ Staff Profile Not Found or Security Match Failed.\nApka Staff ID ya CNIC/Phone number match nahi hua. Meharbani farma kar sahi maloomat darj karein.");
      setAuthLoading(false);
    } catch (err: any) {
      setLoginError(`❌ Verification error: ${err?.message || 'Server connection error'}`);
      setAuthLoading(false);
    }
  };

  // Snappy transition countdown timer for app loading screen
  React.useEffect(() => {
    if (user && loadingCountdown > 0) {
      const delay = !data.loading ? 250 : 800;
      const timer = setTimeout(() => {
        setLoadingCountdown((prev) => (!data.loading ? 0 : Math.max(0, prev - 1)));
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [user, loadingCountdown, data?.loading]);

  // Sync branding once authenticated data is available
  React.useEffect(() => {
    if (data.settings) {
      const logoSource = data.settings.logo;
      if (logoSource) {
        setBrandingSettings((prev) => {
          const newName = data.settings.collegeName || prev.name;
          safeLocalStorage.setItem('college_logo', logoSource);
          safeLocalStorage.setItem('college_name', newName);
          return {
            name: newName,
            logo: logoSource,
          };
        });
      } else if (data.settings.collegeName) {
        setBrandingSettings((prev) => {
          safeLocalStorage.setItem('college_name', data.settings.collegeName);
          return {
            ...prev,
            name: data.settings.collegeName,
          };
        });
      }
    }
  }, [data.settings]);

  // Normalize session format so 2026-2028 becomes 2026-28
  const normalizeSession = (s: string | null | undefined): string => {
    if (!s) return "";
    let trimmed = s.trim();
    if (trimmed.match(/^\d{4}-\d{4}$/)) {
      const parts = trimmed.split('-');
      if (parts[1].length === 4) {
        trimmed = `${parts[0]}-${parts[1].substring(2)}`;
      }
    }
    return trimmed;
  };

  // All Unique Sessions from Data
  const availableSessions = useMemo(() => {
    const sessionSet = new Set<string>();

    ["2024-26", "2025-27", "2026-28", "2027-29"].forEach((s) =>
      sessionSet.add(s),
    );

    if (data.settings?.academicSession) {
      sessionSet.add(normalizeSession(data.settings.academicSession));
    }

    data.admissions.forEach(
      (a) => a.session && sessionSet.add(normalizeSession(a.session)),
    );
    data.students.forEach((s) => s.session && sessionSet.add(normalizeSession(s.session)));
    data.incomes.forEach((i) => i.session && sessionSet.add(normalizeSession(i.session)));
    data.expenses.forEach((e) => e.session && sessionSet.add(normalizeSession(e.session)));

    return Array.from(sessionSet).sort();
  }, [
    data.admissions,
    data.students,
    data.incomes,
    data.expenses,
    data.settings?.academicSession,
  ]);

  // Sync selected session with settings
  const hasLoadedSettingsInitial = React.useRef(false);
  React.useEffect(() => {
    if (data.settings?.academicSession && !hasLoadedSettingsInitial.current) {
      setSelectedSession(normalizeSession(data.settings.academicSession));
      hasLoadedSettingsInitial.current = true;
    }
  }, [data.settings?.academicSession]);

  // Filtered Data based on session
  const filteredData = useMemo(() => {
    const filterBySession = (list: any[]) => {
      if (selectedSession === "all") return list;
      return list.filter(
        (item) => normalizeSession(item.session) === normalizeSession(selectedSession)
      );
    };

    return {
      ...data,
      availableSessions,
      leads: data.leads, // No session filter for leads pool
      admissions: filterBySession(data.admissions),
      students: filterBySession(data.students),
      incomes: filterBySession(data.incomes),
      expenses: filterBySession(data.expenses),
      academicRecords: filterBySession(data.academicRecords),
      // Action wrappers to inject session. Always save as normalized version.
      addLead: (lead: any) =>
        data.addLead({ ...lead, session: normalizeSession(selectedSession) }),
      addAdmission: (admission: any) =>
        data.addAdmission({ ...admission, session: normalizeSession(selectedSession) }),
      addStudent: (student: any) =>
        data.addStudent({ ...student, session: normalizeSession(selectedSession) }),
      addExpense: (expense: any) =>
        data.addExpense({ ...expense, session: normalizeSession(selectedSession) }),
      addIncome: (income: any) =>
        data.addIncome({ ...income, session: normalizeSession(selectedSession) }),
    };
  }, [data, selectedSession, availableSessions]);

  // Dynamic Theme Injection
  const { settings } = data;
  const themeStyles = useMemo(() => {
    if (!settings) return "";
    return `
      :root {
        --primary-color: ${settings.themeColor === "#10b981" ? "#085a4e" : settings.themeColor || "#085a4e"};
        --sidebar-bg: ${settings.sidebarColor === "#0c2d2d" ? "#085a4e" : settings.sidebarColor || "#085a4e"};
        --sidebar-text: ${settings.sidebarTextColor || "#ffffff"};
        --header-bg: ${settings.headerColor || "#ffffff"};
        --header-text: ${settings.headerTextColor || "#0f172a"};
        --font-family: "${settings.fontFamily || "Inter"}", sans-serif;
        --radius: ${
          settings.cardRadius === "none"
            ? "0px"
            : settings.cardRadius === "sm"
              ? "4px"
              : settings.cardRadius === "md"
                ? "8px"
                : settings.cardRadius === "lg"
                  ? "12px"
                  : settings.cardRadius === "2xl"
                    ? "16px"
                    : settings.cardRadius === "3xl"
                      ? "24px"
                      : "24px"
        };
      }
      
      header {
        background-color: var(--header-bg) !important;
        color: var(--header-text) !important;
      }
      
      aside {
        background-color: var(--sidebar-bg) !important;
        color: var(--sidebar-text) !important;
      }
      
      .sidebar-item-active {
        background-color: rgba(255, 255, 255, 0.1) !important;
        border-left-color: var(--superior-gold) !important;
      }
    `;
  }, [settings]);

  const SUPER_ADMIN_EMAILS = ["mughalazam1964@gmail.com", "akhtar147jhn@gmail.com"];
  const isSuperAdmin = useMemo(
    () => user?.email ? SUPER_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase()) : false,
    [user?.email]
  );

  const userPermission = useMemo(() => {
    if (!user?.email) return undefined;
    const email = user.email.toLowerCase().trim();
    const found = data.permissions.find((p) => {
      const pEmail = p.email?.toLowerCase().trim();
      if (!pEmail) return false;
      const isSajidDb = pEmail === "msajidbloch798@gmail.com" || pEmail === "msajidbaloch798@gmail.com";
      const isSajidUser = email === "msajidbloch798@gmail.com" || email === "msajidbaloch798@gmail.com";
      if (isSajidDb && isSajidUser) return true;
      return pEmail === email;
    });

    if (!found) {
      const isSajid = email === "msajidbloch798@gmail.com" || email === "msajidbaloch798@gmail.com";
      if (isSajid) {
        return {
          id: "37aaca5d-62bc-4570-8610-f3801b609b3a",
          email: "msajidbloch798@gmail.com",
          displayName: "Sajid",
          sections: ["leads", "admissions", "accounts", "students", "fee"],
          isAdmin: false
        };
      }
    }
    return found;
  }, [data.permissions, user?.email]);
  const isAdmin = useMemo(
    () => isSuperAdmin || userPermission?.isAdmin,
    [isSuperAdmin, userPermission?.isAdmin],
  );
  const hasAnyAccess = useMemo(
    () =>
      isAdmin || (userPermission && userPermission.sections.length > 0),
    [isAdmin, userPermission],
  );

  // Filter out dashboard from allowed sections if not super admin
  const allowedSections = useMemo(() => {
    const modulesFromSettings =
      data.settings?.enabledModules && data.settings.enabledModules.length > 0
        ? data.settings.enabledModules
        : [
            "dashboard",
            "leads",
            "admissions",
            "students",
            "staff",
            "accounts",
            "reports",
            "settings",
            "academic",
            "attendance",
            "classes",
            "timetable",
            "library",
            "fee",
          ];

    const parentMap: Record<string, string> = {
      "admissions-fsc": "admissions",
      "admissions-ukl3": "admissions",
      "admissions-dit": "admissions",
      "admissions-bs": "admissions",
      "fee-boys": "fee",
      "fee-girls": "fee",
      "fee-ukl3": "fee",
      "fee-dit": "fee",
      "fee-bs": "fee",
      "students-boys": "students",
      "students-girls": "students",
      "students-ukl3": "students",
      "students-dit": "students",
      "students-bs": "students",
    };

    if (isAdmin) {
      return Array.from(new Set([
        ...modulesFromSettings, 
        ...Object.keys(parentMap), 
        "dashboard", "fee", "academic", "attendance", "library", "accounts", "classes", "timetable", "reports", "leads", "admissions", "students", "staff", "settings", "whatsapp-center"
      ]));
    }

    const allowed = (userPermission?.sections || []).filter((s) => {
      const parent = parentMap[s] || s;
      return modulesFromSettings.includes(parent) || modulesFromSettings.includes(s);
    });

    // If a parent is explicitly allowed, allow all its mapped children
    const explicitlyAllowedParents = allowed.filter((s) =>
      Object.values(parentMap).includes(s),
    );
    const childrenToAdd = Object.keys(parentMap).filter((child) =>
      explicitlyAllowedParents.includes(parentMap[child]),
    );

    // Add parent sections implicitly so that UI checks like allowedSections.includes('admissions') will work
    // if 'admissions-fsc' is allowed
    const parentsToAdd = allowed
      .map((s) => parentMap[s])
      .filter(Boolean) as string[];

    return Array.from(new Set([...allowed, ...childrenToAdd, ...parentsToAdd]));
  }, [isAdmin, userPermission?.sections, data.settings?.enabledModules]);

  // Auto-redirect unauthorized users away from Dashboard
  React.useEffect(() => {
    if (user && !authLoading && !isAdmin) {
      const parentMap: Record<string, string> = {
        "admissions-fsc": "admissions",
        "admissions-ukl3": "admissions",
        "admissions-dit": "admissions",
        "admissions-bs": "admissions",
        "fee-boys": "fee",
        "fee-girls": "fee",
        "fee-ukl3": "fee",
        "fee-dit": "fee",
        "fee-bs": "fee",
        "students-boys": "students",
        "students-girls": "students",
        "students-ukl3": "students",
        "students-dit": "students",
        "students-bs": "students",
      };

      const parent = parentMap[activePage] || activePage;
      const isCurrentlyUnauthorized =
        activePage === "dashboard" ||
        (!allowedSections.includes(activePage) &&
          !allowedSections.includes(parent));

      if (isCurrentlyUnauthorized && allowedSections.length > 0) {
        const firstSection =
          allowedSections.filter((s) => s !== "dashboard")[0] ||
          allowedSections[0];

        const defaultPages: Record<string, Page> = {
          admissions: "admissions-fsc",
          students: "students-boys",
          fee: "fee-boys",
          accounts: "accounts",
        };

        setActivePage(defaultPages[firstSection] || (firstSection as Page));
      }
    }
  }, [user, authLoading, isAdmin, activePage, allowedSections]);

  const defaultersCount = useMemo(
    () =>
      data.students.filter((s) =>
        s.feeHistory?.some(
          (f) => f.status === "Unpaid" || f.status === "Partial",
        ),
      ).length,
    [data.students],
  );

  /* 
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
      // Reset password verification on auth change
      setIsPasswordVerified(false);
      setEnteredPassword('');
    });
    return () => unsubscribe();
  }, []);
  */

  const handlePasswordVerify = () => {
    if (isAdmin) {
      setIsPasswordVerified(true);
      return;
    }
    if (userPermission && userPermission.customPassword === enteredPassword) {
      setIsPasswordVerified(true);
      toast.success("Identity verified successfully");
    } else {
      toast.error("Invalid password provided");
    }
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenu((prev) => (prev === menu ? null : menu));
  };

  const handleNavClick = (
    pageId: Page,
    filter: string | null = null,
    parentMenu: string | null = null,
  ) => {
    setActivePage(pageId);
    setActiveFilter(filter);

    // Auto-expand parent menu if it's a sub-page
    const autoParent =
      {
        "students-boys": "students",
        "students-girls": "students",
        "fee-boys": "fee",
        "fee-girls": "fee",
        staff: "staff",
        accounts: "accounts",
      }[pageId as string] || null;

    setExpandedMenu(parentMenu || autoParent);
  };

  const isVerifyMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).has('verify') ||
    new URLSearchParams(window.location.search).has('v') ||
    window.location.pathname.startsWith('/verify')
  );

  if (isVerifyMode) {
    return (
      <PublicVerificationView 
        onGoToAdmin={() => {
          window.location.href = window.location.origin + window.location.pathname;
        }} 
      />
    );
  }

  if (authLoading || (!user && !portalSession && !isBrandingLoaded) || ((user || portalSession) && data.loading)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden font-sans select-none px-4">
        {/* Academic Blueprint Canvas Background */}
        <AcademicCanvasBackground logo={brandingSettings.logo} />

        {/* Central Floating Crystal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg bg-white/90 border border-slate-200/90 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_70px_rgba(8,90,78,0.12),inset_0_1px_1px_rgba(255,255,255,1)] backdrop-blur-2xl flex flex-col items-center text-center overflow-hidden"
        >
          {/* Top Emerald Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#085a4e]/50 to-transparent" />

          {/* 3D Floating College Crest Medallion */}
          <div className="relative mb-6 w-32 h-32 flex items-center justify-center perspective-[800px]">
            <div className="absolute inset-1 rounded-full border border-emerald-500/30 shadow-[0_0_25px_rgba(8,90,78,0.2)] animate-pulse" />
            <div className="w-28 h-28 rounded-full p-[4px] bg-gradient-to-tr from-[#8a651a] via-[#f7e096] to-[#b89437] shadow-xl flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2.5 overflow-hidden">
                {brandingSettings.logo ? (
                  <img src={brandingSettings.logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <School size={48} className="text-[#085a4e]" />
                )}
              </div>
            </div>
            {/* Spinning Outer Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-4px] rounded-full border border-emerald-600/30 border-t-[#085a4e]"
            />
          </div>

          {/* Institutional Branding */}
          <div className="space-y-1 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-black uppercase tracking-[0.25em] text-[#085a4e] shadow-xs">
              <Sparkles size={10} />
              <span>Superior Group of Colleges</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-1">
              {brandingSettings.name || "Superior College Jahanian"}
            </h2>
            <p className="text-[11px] font-bold text-emerald-700 tracking-wide">
              Jahanian Main Campus • Academic Operating Cloud
            </p>
          </div>

          {/* Dynamic Progress Indicator */}
          <div className="w-full max-w-xs mt-4 pt-2">
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80 relative">
              <motion.div
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="w-1/2 h-full bg-gradient-to-r from-[#085a4e] via-[#0a6d5f] to-[#c9a84c] rounded-full shadow-[0_0_10px_rgba(8,90,78,0.3)]"
              />
            </div>
            <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2.5">
              {authLoading ? "Verifying Credentials & Workspace..." : "Connecting to Secure Academic Environment..."}
            </p>
          </div>

          {/* Footer Security Pill */}
          <div className="flex items-center gap-1.5 mt-6 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <Shield size={12} className="text-[#085a4e]" />
            <span>256-Bit TLS 1.3 Certified • Institutional Gateway</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active student or faculty portal session view
  if (portalSession) {
    if (portalSession.type === "student") {
      const liveStudent = (data.students || []).find((s) => s.id === portalSession.data?.id) || portalSession.data;
      return (
        <StudentPortal
          student={liveStudent}
          academicRecords={data.academicRecords || []}
          staffTimetable={data.staffTimetable || []}
          studentAttendance={data.studentAttendance || []}
          collegeSettings={brandingSettings}
          onLogout={() => {
            safeLocalStorage.removeItem("scj_portal_user");
            setPortalSession(null);
            toast.info("Logged out from Student Portal");
          }}
        />
      );
    } else if (portalSession.type === "staff") {
      const liveStaff = (data.staff || []).find((st) => st.id === portalSession.data?.id) || portalSession.data;
      return (
        <StaffPortal
          staff={liveStaff}
          staffTimetable={data.staffTimetable || []}
          staffAttendance={data.staffAttendance || []}
          salaryPayments={data.salaryPayments || []}
          staffAdvances={data.staffAdvances || []}
          collegeSettings={brandingSettings}
          onLogout={() => {
            safeLocalStorage.removeItem("scj_portal_user");
            setPortalSession(null);
            toast.info("Logged out from Faculty Portal");
          }}
        />
      );
    }
  }

  if (!user) {
    if (portalViewMode === "welcome") {
      return (
        <WelcomeScreen
          brandingSettings={brandingSettings}
          onEnter={() => setPortalViewMode("gateway")}
          onDirectSelectPortal={(portal) => {
            setLoginPortal(portal);
            setPortalViewMode("login");
            setLoginError("");
          }}
        />
      );
    }

    if (portalViewMode === "gateway") {
      return (
        <PortalGatewayView
          brandingSettings={brandingSettings}
          onSelectPortal={(portal) => {
            setLoginPortal(portal);
            setPortalViewMode("login");
            setLoginError("");
          }}
          onBackToWelcome={() => setPortalViewMode("welcome")}
        />
      );
    }

    const currentPortalConfig = {
      student: {
        badge: "STUDENT ACADEMIC ACCESS",
        badgeClass: "bg-[#063b30] text-amber-200 border-superior-gold/35",
        btnClass: "bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] text-slate-950 font-black shadow-[0_10px_30px_rgba(201,168,76,0.35)] hover:shadow-[0_15px_45px_rgba(201,168,76,0.55)] hover:brightness-110",
        accentBorder: "focus:border-superior-gold focus:ring-2 focus:ring-superior-gold/30",
        welcomeRole: "Student Portal",
        welcomeGreeting: "Welcome Back, Student",
        welcomeDesc: "Enter your roll number and registered contact to view fee vouchers, result cards, and timetables.",
        rightBadge: "ACADEMIC EXCELLENCE & SCHOLARSHIP",
        rightTitle: "Empowering Scholars Toward Extraordinary Heights.",
        rightDesc: "Welcome to the official student portal. Check clearance status on fee vouchers, download verified 3-copy bank challans, inspect terminal examination marksheets, and view lecture rosters.",
        bentoTiles: [
          { title: "Bank Fee Clearance", metric: "100% Cleared", sub: "Bank Reconciled • Verified", icon: CheckCircle2, tag: "Status: Verified", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "Terminal Result Cards", metric: "Grade A+ (82/85)", sub: "Physics Mid-Term Evaluation", icon: Award, tag: "Term Record", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "Classroom Presence", metric: "97.4% Attendance", sub: "Active Semester Presence", icon: Calendar, tag: "Real-time Meter", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
        ],
        quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.",
        quoteAuthor: "Superior Academic Senate",
      },
      staff: {
        badge: "FACULTY WORKPLACE",
        badgeClass: "bg-[#063b30] text-amber-200 border-superior-gold/35",
        btnClass: "bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] text-slate-950 font-black shadow-[0_10px_30px_rgba(201,168,76,0.35)] hover:shadow-[0_15px_45px_rgba(201,168,76,0.55)] hover:brightness-110",
        accentBorder: "focus:border-superior-gold focus:ring-2 focus:ring-superior-gold/30",
        welcomeRole: "Faculty Workplace",
        welcomeGreeting: "Welcome, Faculty Member",
        welcomeDesc: "Enter your staff ID and password or CNIC to review class rosters, biometric logs, and monthly payslips.",
        rightBadge: "PEDAGOGICAL LEADERSHIP",
        rightTitle: "Dedicated to World-Class Teaching & Mentorship.",
        rightDesc: "A unified digital terminal for teaching faculty and staff. Manage assigned period schedules, review daily biometric attendance entries, and access authenticated monthly salary vouchers.",
        bentoTiles: [
          { title: "Assigned Teaching Roster", metric: "4 Periods Today", sub: "Room 14 (ICS-II) • Morning Session", icon: Calendar, tag: "Class Active", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "Biometric Verification", metric: "08:02 AM Punch", sub: "Official Duty Check-In Confirmed", icon: Clock, tag: "Status: On Duty", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "Payroll & Compensation", metric: "Payslip Ready", sub: "Monthly Salary Voucher Reconciled", icon: CreditCard, tag: "PDF Download", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
        ],
        quote: "The task of the modern educator is not to cut down jungles, but to irrigate deserts and inspire discovery.",
        quoteAuthor: "Faculty Advisory Board",
      },
      admin: {
        badge: "CAMPUS GOVERNANCE",
        badgeClass: "bg-[#063b30] text-amber-200 border-superior-gold/35",
        btnClass: "bg-gradient-to-r from-[#c9a84c] via-[#f7e096] to-[#b89437] text-slate-950 font-black shadow-[0_10px_30px_rgba(201,168,76,0.35)] hover:shadow-[0_15px_45px_rgba(201,168,76,0.55)] hover:brightness-110",
        accentBorder: "focus:border-superior-gold focus:ring-2 focus:ring-superior-gold/30",
        welcomeRole: "Administrative Console",
        welcomeGreeting: "Administrative Console",
        welcomeDesc: "Authorized personnel access only. Manage admissions pipelines, double-entry cashbooks, and campus staff.",
        rightBadge: "INSTITUTIONAL GOVERNANCE",
        rightTitle: "Enterprise Governance & Real-Time Intelligence.",
        rightDesc: "Master institutional command terminal. Supervise pre-admission lead conversions, monitor live double-entry accounts ledgers, disburse faculty payroll, and orchestrate campus-wide communications.",
        bentoTiles: [
          { title: "Total Student Enrollment", metric: "1,450+ Scholars", sub: "Active Enrolled Scholars Monitored", icon: Users, tag: "Live Roster", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "Double-Entry Ledger", metric: "Accounts Balanced", sub: "Cashbook & Fee Clearance Audited", icon: Wallet, tag: "Audit Passed", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
          { title: "System Security Node", metric: "256-Bit SSL", sub: "End-to-End Cryptographic Protection", icon: Shield, tag: "Cloud Sync OK", tagClass: "bg-superior-gold/15 text-amber-200 border-superior-gold/35" },
        ],
        quote: "Strategic institutional leadership builds sustainable academic excellence and enduring community trust.",
        quoteAuthor: "Executive Board of Trustees",
      },
    }[loginPortal];

    return (
      <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-5 lg:p-7 font-sans select-none relative overflow-x-hidden overflow-y-auto text-slate-800">
        {/* Real Campus Photo Background + Reduced Wave & Top Slogan */}
        <AcademicCanvasBackground logo={brandingSettings.logo} />

        {/* Master Split-Card Container (1140-1180px width) */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[1140px] xl:max-w-[1180px] mx-auto rounded-3xl sm:rounded-[2.25rem] bg-white border border-slate-200/90 shadow-[0_25px_80px_rgba(0,0,0,0.22)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:min-h-[600px]"
        >
          {/* LEFT PANEL (approx 38-40% - 5 cols): Deep Superior Emerald Brand Canvas */}
          <div className="lg:col-span-5 bg-gradient-to-br from-[#064e43] via-[#053e35] to-[#022822] p-7 sm:p-9 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            {/* Subtle Background Watermark */}
            <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
            <div className="absolute top-1/4 right-0 w-80 h-80 opacity-[0.08] pointer-events-none text-white flex items-center justify-center">
              <GraduationCap size={320} className="stroke-[1]" />
            </div>
            <div className="absolute -top-16 -left-16 w-60 h-60 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Top Navigation: Return to Portals & TLS Badge */}
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setPortalViewMode("gateway");
                    setLoginError("");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all cursor-pointer group shadow-sm backdrop-blur-md"
                >
                  <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                  <span>Return to Portals</span>
                </button>

                <span className="text-[10px] font-mono text-emerald-200 tracking-wider">
                  TLS 1.3 SECURE
                </span>
              </div>

              {/* Brand Identity Lockup */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#c9a84c] via-[#f7e096] to-[#b89437] shadow-lg flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                    {brandingSettings.logo ? (
                      <img
                        src={brandingSettings.logo}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <School size={22} className="text-[#053229]" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-xs sm:text-[13px] font-black text-white uppercase tracking-wider leading-snug">
                    {brandingSettings.name || "SUPERIOR COLLEGE JAHANIAN"}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-amber-200/90 tracking-wide">
                    Jahanian Campus &bull; {currentPortalConfig.welcomeRole}
                  </p>
                </div>
              </div>

              {/* Welcome Role Header & Description */}
              <div className="mb-7">
                <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-white leading-tight">
                  Welcome to{" "}
                  <span className="text-[#f5d47a] block sm:inline">
                    {currentPortalConfig.welcomeRole}.
                  </span>
                </h1>
                <p className="text-xs sm:text-[13px] text-emerald-100/85 mt-2.5 leading-relaxed max-w-md">
                  {currentPortalConfig.welcomeDesc}
                </p>
              </div>

              {/* 3 Role-Specific Feature Pillars */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {currentPortalConfig.bentoTiles.map((tile, idx) => {
                  const TileIcon = tile.icon;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-800/60 border border-emerald-500/30 flex items-center justify-center text-emerald-200 mb-2 shadow-inner">
                        <TileIcon size={18} />
                      </div>
                      <h4 className="text-[11px] sm:text-xs font-bold text-white leading-tight">
                        {tile.title}
                      </h4>
                      <p className="text-[9.5px] sm:text-[10px] text-emerald-200/70 mt-1 leading-snug">
                        {tile.sub}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Slogan Line */}
            <div className="relative z-10 pt-5 mt-5 border-t border-emerald-700/40 text-center">
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-200/60 uppercase tracking-[0.25em]">
                &mdash;&mdash; EMPOWERING BRIGHTER TOMORROWS &mdash;&mdash;
              </span>
            </div>
          </div>

          {/* RIGHT PANEL (approx 60-62% - 7 cols): Crisp White Authentication Studio */}
          <div className="lg:col-span-7 bg-white p-7 sm:p-9 lg:p-11 flex flex-col justify-between relative">
            {/* Top Status Indicators Row */}
            <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] sm:text-xs font-semibold text-emerald-900 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Academic Systems Operational</span>
              </div>

              <div className="flex items-center gap-3 text-slate-500 text-[11px] sm:text-xs font-medium">
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Lock size={13} className="text-emerald-700" />
                  <span>Secure Login</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-slate-400">
                  <Wifi size={12} className="text-emerald-700" />
                  <span>TLS 1.3 Encrypted</span>
                </span>
              </div>
            </div>

            {/* Centered Auth Studio Container */}
            <div className="my-auto py-2 flex justify-center w-full">
              <PortalAuthCard
                loginPortal={loginPortal}
                currentPortalConfig={currentPortalConfig}
                brandingSettings={brandingSettings}
                students={data.students || []}
                staffList={data.staff || []}
                authLoading={authLoading}
                setAuthLoading={setAuthLoading}
                onLoginSuccessStudent={(matchedStudent) => {
                  const sessionObj = { type: 'student' as const, data: matchedStudent };
                  safeLocalStorage.setItem('scj_portal_user', JSON.stringify(sessionObj));
                  setPortalSession(sessionObj);
                  toast.success(`Welcome to Student Portal, ${matchedStudent.fullName || 'Student'}!`);
                  setAuthLoading(false);
                }}
                onLoginSuccessStaff={(matchedStaff) => {
                  const sessionObj = { type: 'staff' as const, data: matchedStaff };
                  safeLocalStorage.setItem('scj_portal_user', JSON.stringify(sessionObj));
                  setPortalSession(sessionObj);
                  toast.success(`Welcome to Faculty Portal, ${matchedStaff.fullName || 'Professor'}!`);
                  setAuthLoading(false);
                }}
                onAdminLogin={handleLogin}
                adminEmail={email}
                setAdminEmail={setEmail}
                adminPassword={password}
                setAdminPassword={setPassword}
                rememberMe={rememberMe}
                setRememberMe={setRememberMe}
                onBackToGateway={() => {
                  setPortalViewMode("gateway");
                  setLoginError("");
                }}
              />
            </div>

            {/* Bottom Card Footer */}
            <div className="w-full pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>&copy; 2026 Superior Group of Colleges Jahanian. All rights reserved.</span>
              <span className="font-medium text-slate-500">Session 2026-28</span>
            </div>
          </div>

        </motion.div>
      </div>
    );
  }

  if (data.loading || loadingCountdown > 0) {
    const percentMap: Record<number, number> = {
      5: 18,
      4: 42,
      3: 68,
      2: 88,
      1: 96,
      0: 100
    };
    const currentPercent = percentMap[loadingCountdown] || 15;
    
    const steps = [
      { id: 1, label: "AUTHENTICATING", icon: UserCheck },
      { id: 2, label: "VERIFYING", icon: Database },
      { id: 3, label: "SECURING", icon: Shield },
      { id: 4, label: "FINALIZING", icon: CheckCircle2 }
    ];

    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden font-sans select-none px-4">
        {/* Architectural Academic Blueprint Canvas */}
        <AcademicCanvasBackground logo={brandingSettings.logo} />

        {/* Floating Master Crystal Pellet Card */}
        <div className="relative z-10 w-full max-w-xl bg-white/95 border border-slate-200/90 rounded-[2.5rem] p-8 md:p-10 shadow-[0_25px_70px_rgba(8,90,78,0.12)] backdrop-blur-xl flex flex-col items-center overflow-hidden">
          {/* Top Accent Line */}
          <div className="absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#085a4e]/50 to-transparent" />

          {/* Main Logo Sphere */}
          <div className="relative mb-6 w-32 h-32 flex items-center justify-center">
            {/* Glowing inner rings */}
            <div className="absolute inset-1 rounded-full border border-emerald-500/30 shadow-[0_0_25px_rgba(8,90,78,0.2)] animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-[#085a4e]/30 bg-gradient-to-tr from-[#085a4e] via-[#0a6d5f] to-[#c9a84c] shadow-lg p-[2px] overflow-hidden">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-2.5 overflow-hidden">
                {brandingSettings.logo ? (
                  <img src={brandingSettings.logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <School size={56} className="text-[#085a4e]" />
                )}
              </div>
            </div>
            {/* Countdown HUD Center Overlaid */}
            {loadingCountdown > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-emerald-500/60 rounded-full w-8 h-8 flex items-center justify-center z-20 shadow-md text-[#c9a84c] font-sans font-black text-xs">
                {loadingCountdown}s
              </div>
            )}
            
            {/* Rotating Outer Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-8px] rounded-full border border-emerald-600/30 border-t-[#085a4e]"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-16px] rounded-full border border-slate-200/60 border-b-emerald-600/30 pointer-events-none"
            />
          </div>

          {/* Heading Text display */}
          <div className="text-center space-y-1">
            <h1 className="text-xs md:text-sm font-black text-emerald-800 tracking-[0.25em] uppercase">
              {brandingSettings.name || "Superior College"}
            </h1>
            {!(brandingSettings.name || "").toLowerCase().includes("jahanian") && (
              <h2 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight uppercase">
                Jahanian Campus
              </h2>
            )}
          </div>

          {/* Graduation Cap Lines Divider */}
          <div className="flex items-center gap-3 w-48 my-3 mx-auto">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-emerald-600/40" />
            <GraduationCap className="text-[#085a4e] w-4 h-4 shrink-0" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-emerald-600/40" />
          </div>

          {/* Welcome subtitle message */}
          {user && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs md:text-sm text-slate-600 font-medium tracking-wide mb-5 text-center"
            >
              Welcome back, <span className="text-emerald-800 font-black">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin"}</span>! Logging you in...
            </motion.p>
          )}

          {/* Crystal Pellet Stepper Card */}
          <div className="w-full bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-5 shadow-inner mt-2">
            {/* Steps line horizontal layout */}
            <div className="flex items-center justify-between relative mb-6 px-2">
              {/* Connecting line behind icons */}
              <div className="absolute top-[20px] left-8 right-8 h-[2px] bg-slate-200 z-0 rounded-full">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#085a4e] via-[#0a6d5f] to-[#c9a84c]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, (Math.max(0, 5 - loadingCountdown - 1) / 3) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {steps.map((st) => {
                const currentProgressIndex = 5 - loadingCountdown;
                const isCompleted = currentProgressIndex >= st.id;
                const isActive = currentProgressIndex === st.id - 1;

                return (
                  <div key={st.id} className="flex flex-col items-center z-10 relative flex-1">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={cn(
                        "w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 shadow-xs",
                        isCompleted
                          ? "bg-[#085a4e] border-[#085a4e] text-white"
                          : isActive
                          ? "bg-emerald-50 border-emerald-600 text-[#085a4e] shadow-[0_0_12px_rgba(8,90,78,0.3)]"
                          : "bg-white border-slate-200 text-slate-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={16} className="stroke-[3]" />
                      ) : (
                        <st.icon size={15} className={cn(isActive && "animate-pulse")} />
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        "text-[9px] font-black tracking-wider uppercase mt-2.5 transition-colors duration-300",
                        isCompleted ? "text-[#085a4e]" : isActive ? "text-slate-900" : "text-slate-400"
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dynamic system percentage loader */}
            <div className="space-y-1.5 px-1 mt-4">
              <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-slate-700 uppercase">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Enterprise Core System
                </span>
                <span className="font-mono text-emerald-800">{currentPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border border-slate-200/80 relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#085a4e] via-[#0a6d5f] to-[#c9a84c] shadow-[0_0_10px_rgba(8,90,78,0.3)] rounded-full"
                  initial={{ width: "15%" }}
                  animate={{ width: `${currentPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Shield safety caption */}
          <div className="flex items-center gap-1.5 mt-6 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            <Shield size={12} className="text-[#085a4e] shrink-0" />
            <span>Secure TLS Connection • Superior Academic Cloud</span>
          </div>

        </div>
      </div>
    );
  }

  if (!isSuperAdmin && !hasAnyAccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#021c17] via-[#053229] to-[#011410] font-sans p-6 text-center select-none">
        <div className="max-w-md w-full bg-[#03241e]/75 border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.85)] p-8 backdrop-blur-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Shield size={40} className="text-red-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-[0.1em] mb-2">Access Restrained</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            Your account (<span className="text-superior-gold font-mono">{user?.email}</span>) is verified, but has not been assigned to any sub-admin module by the Master Admin yet.
          </p>
          <div className="h-[2px] w-12 bg-superior-gold/20 rounded-full mx-auto mb-6" />
          <p className="text-xs text-superior-gold tracking-[0.15em] uppercase font-black mb-6 animate-pulse">
            Awaiting Approval
          </p>
          <Button 
            onClick={handleLogout}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold shadow-[0_4px_15px_rgba(239,68,68,0.3)] duration-300 transition-all"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden relative">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Overlay Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Sidebar as Floating Drawer */}
            <motion.aside
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed left-0 top-0 bottom-0 w-[265px] bg-gradient-to-b from-[#064e43] via-[#053d34] to-[#042822] text-white z-50 flex flex-col shadow-[24px_0_48px_rgba(0,0,0,0.5)] border-r border-white/10 overflow-hidden"
            >
              {/* Premium Background Effects */}
              <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-superior-gold/10 to-transparent z-0 pointer-events-none" />
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-superior-gold/10 rounded-full blur-[100px] z-0 pointer-events-none" />

              <div className="px-4 py-3.5 h-16 flex items-center justify-between relative z-10 border-b border-white/10 bg-black/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-superior-gold/50 to-superior-gold/10 p-[1.5px] flex items-center justify-center shrink-0 shadow-md">
                    <div 
                      className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center p-0.5"
                      style={{ clipPath: 'circle(49.5% at 50% 50%)' }}
                    >
                      {brandingSettings.logo ? (
                        <img
                          src={brandingSettings.logo}
                          alt="Logo"
                          className="w-full h-full rounded-full object-contain select-none"
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                            const parent = (e.target as any).parentElement;
                            if (
                              parent &&
                              !parent.querySelector(".fallback-icon")
                            ) {
                              parent.innerHTML =
                                '<div class="fallback-icon flex items-center justify-center text-superior-teal"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m3 12 8-4h2l8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg></div>';
                            }
                          }}
                        />
                      ) : (
                        <School size={18} className="text-superior-teal" />
                      )}
                    </div>
                  </div>
                  <div className="overflow-hidden text-left flex flex-col justify-center">
                    <h1 className="font-sans font-black text-[13px] leading-tight tracking-wide text-white truncate max-w-[150px]">
                      {settings?.collegeName || "Superior College"}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-superior-gold shadow-[0_0_6px_rgba(201,168,76,0.8)] animate-pulse" />
                      <p className="text-[9px] text-white/70 font-mono tracking-wider font-bold uppercase truncate">
                        {settings?.campusName || "Jahanian"} • {selectedSession}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white/40 hover:text-white hover:bg-white/10 rounded-lg h-8 w-8 transition-colors"
                  title="Close Menu"
                >
                  <X size={16} />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-3 mt-1 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <nav className="pb-4 space-y-0.5">
                  {allowedSections.includes("dashboard") && (
                    <NavSection title="Main Console">
                      <NavItem
                        id="dashboard"
                        label="Dashboard"
                        icon={LayoutDashboard}
                        expandedMenu={expandedMenu}
                        activePage={activePage}
                        activeFilter={activeFilter}
                        onToggleMenu={toggleMenu}
                        onNavClick={handleNavClick}
                      />
                    </NavSection>
                  )}

                  {(allowedSections.includes("leads") ||
                    allowedSections.includes("admissions") ||
                    allowedSections.includes("students") ||
                    allowedSections.includes("academic") ||
                    allowedSections.includes("attendance")) && (
                    <NavSection title="Academic">
                      {allowedSections.includes("leads") && (
                        <NavItem
                          id="leads"
                          label="Lead Pipeline"
                          icon={BarChart3}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("admissions") && (
                        <NavItem
                          id="admissions"
                          label="Admissions"
                          icon={UserPlus}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("students") && (
                        <NavItem
                          id="students"
                          label="Students"
                          icon={Users}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("attendance") && (
                        <NavItem
                          id="attendance"
                          label="Attendance"
                          icon={CheckCircle2}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("academic") && (
                        <NavItem
                          id="academic"
                          label="Grades & Results"
                          icon={Award}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                    </NavSection>
                  )}

                  {(allowedSections.includes("fee") ||
                    allowedSections.includes("accounts")) && (
                    <NavSection title="Finance">
                      {allowedSections.includes("fee") && (
                        <NavItem
                          id="fee"
                          label="Fees & Billing"
                          icon={CreditCard}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("accounts") && (
                        <NavItem
                          id="accounts"
                          label="Expenses & Income"
                          icon={Wallet}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                    </NavSection>
                  )}

                  {(allowedSections.includes("staff") ||
                    allowedSections.includes("classes") ||
                    allowedSections.includes("timetable") ||
                    allowedSections.includes("library") ||
                    allowedSections.includes("reports") ||
                    allowedSections.includes("settings")) && (
                    <NavSection title="Admin">
                      {allowedSections.includes("classes") && (
                        <NavItem
                          id="classes"
                          label="Classes & Subjects"
                          icon={BookOpen}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("timetable") && (
                        <NavItem
                          id="timetable"
                          label="Timetable"
                          icon={Calendar}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("staff") && (
                        <NavItem
                          id="staff"
                          label="Staff & Payroll"
                          icon={Briefcase}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("library") && (
                        <NavItem
                            id="library"
                            label="Library"
                            icon={BookOpen}
                            expandedMenu={expandedMenu}
                            activePage={activePage}
                            activeFilter={activeFilter}
                            onToggleMenu={toggleMenu}
                            onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("reports") && (
                        <NavItem
                          id="reports"
                          label="Intelligence Reports"
                          icon={FileText}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                      {allowedSections.includes("settings") && (
                        <NavItem
                          id="settings"
                          label="System Settings"
                          icon={SettingsIcon}
                          expandedMenu={expandedMenu}
                          activePage={activePage}
                          activeFilter={activeFilter}
                          onToggleMenu={toggleMenu}
                          onNavClick={handleNavClick}
                        />
                      )}
                    </NavSection>
                  )}

                  {allowedSections.includes("whatsapp-center") && (
                    <NavSection title="Additional">
                      <NavItem
                        id="whatsapp-center"
                        label="WhatsApp Center"
                        icon={MessageCircle}
                        expandedMenu={expandedMenu}
                        activePage={activePage}
                        activeFilter={activeFilter}
                        onToggleMenu={toggleMenu}
                        onNavClick={handleNavClick}
                      />
                    </NavSection>
                  )}
                </nav>
              </ScrollArea>

              <div className="p-2.5 relative z-10 bg-transparent border-t border-white/[0.04]">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-superior-gold/80 to-yellow-600/80 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {(userPermission?.displayName || user?.user_metadata?.full_name || (isAdmin ? "Master Admin" : "Admin"))[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white/90 truncate max-w-[100px]">
                        {userPermission?.displayName || user?.user_metadata?.full_name || (isAdmin ? "Master Admin" : "System Admin")}
                      </span>
                      <span className="text-[9px] text-white/40 flex items-center gap-1.5 font-medium tracking-wide mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                        Active session
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fcfdfd] dark:bg-slate-950">
        {/* Header - Unified Navigation */}
        {/* Header - Unified Navigation */}
        <header className="h-18 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between px-5 md:px-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-600 dark:text-slate-300 hover:text-superior-teal hover:bg-emerald-50/50 dark:hover:bg-slate-800 rounded-xl h-10 w-10 transition-all active:scale-95"
              title="Open Navigation Menu"
            >
              <Menu size={22} />
            </Button>

            {/* Dynamic Campus Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
              <School size={13} className="text-superior-teal dark:text-superior-gold" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activePage.includes("boys") ? "Boys Campus" : activePage.includes("girls") ? "Girls Campus" : (settings?.campusName || "Jahanian Campus")}
              </span>
            </div>

            {/* Active View Indicator */}
            <div className="flex items-center gap-2.5 bg-superior-teal/5 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-superior-teal/15 dark:border-slate-700">
              <div className="w-2 h-2 rounded-full bg-superior-gold shadow-[0_0_8px_rgba(201,168,76,0.6)]" />
              <h2 className="text-[11px] font-black text-superior-teal dark:text-emerald-400 uppercase tracking-[0.2em]">
                {activePage.replace("-", " ")}
              </h2>
            </div>
          </div>

          {/* Shortcut Modules Floating Bar */}
          <div className="hidden lg:flex flex-1 justify-center px-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
              {[
                { id: "dashboard", label: "Dashboard", Icon: Home, color: "text-blue-500", shadow: "drop-shadow-[0_4px_6px_rgba(59,130,246,0.4)]" },
                { id: "leads", label: "Marketing", Icon: Sparkles, color: "text-pink-500", shadow: "drop-shadow-[0_4px_6px_rgba(236,72,153,0.4)]" },
                { id: "admissions", label: "Admissions", Icon: Layers, color: "text-purple-500", shadow: "drop-shadow-[0_4px_6px_rgba(168,85,247,0.4)]" },
                { id: "students", label: "Students", Icon: Users, color: "text-emerald-500", shadow: "drop-shadow-[0_4px_6px_rgba(16,185,129,0.4)]" },
                { id: "staff", label: "Staff", Icon: Briefcase, color: "text-amber-500", shadow: "drop-shadow-[0_4px_6px_rgba(245,158,11,0.4)]" },
                { id: "fee", label: "Accounts", Icon: Wallet, color: "text-teal-500", shadow: "drop-shadow-[0_4px_6px_rgba(20,184,166,0.4)]" },
                { id: "academic", label: "Academic", Icon: GraduationCap, color: "text-indigo-500", shadow: "drop-shadow-[0_4px_6px_rgba(99,102,241,0.4)]" },
                { id: "attendance", label: "Attendance", Icon: CheckCircle2, color: "text-green-500", shadow: "drop-shadow-[0_4px_6px_rgba(34,197,94,0.4)]" },
                { id: "reports", label: "Reports", Icon: BarChart3, color: "text-rose-500", shadow: "drop-shadow-[0_4px_6px_rgba(244,63,94,0.4)]" },
                { id: "settings", label: "Settings", Icon: SettingsIcon, color: "text-slate-600 dark:text-slate-300", shadow: "drop-shadow-[0_4px_6px_rgba(100,116,139,0.4)]" },
              ]
                .filter((mod) => allowedSections.includes(mod.id))
                .map((mod) => {
                  const isActive = activePage === mod.id || activePage.startsWith(mod.id);
                  return (
                    <div key={mod.id} className="relative group flex items-center justify-center">
                      <motion.button
                        whileHover={{ scale: 1.12, y: -2 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 350 }}
                        onClick={() => handleNavClick(mod.id as Page)}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 relative",
                          isActive
                            ? "bg-white dark:bg-slate-700 shadow-sm border border-superior-teal/30 dark:border-superior-gold/30 ring-2 ring-superior-teal/20"
                            : "hover:bg-white/80 dark:hover:bg-slate-700/60 text-slate-500"
                        )}
                      >
                        <mod.Icon 
                          size={20} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={cn(
                            "transition-all duration-200",
                            isActive 
                              ? `${mod.color} ${mod.shadow} scale-105` 
                              : `text-slate-500 dark:text-slate-400 group-hover:${mod.color} group-hover:${mod.shadow} group-hover:scale-105`
                          )}
                        />
                      </motion.button>
                      
                      {/* Tooltip */}
                      <div className="absolute top-[48px] left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-[60] whitespace-nowrap shadow-lg">
                        {mod.label}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Action Stack */}
          <div className="flex items-center gap-2.5 md:gap-3">
            {/* Academic Session Selector Dropdown Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                Session:
              </span>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="bg-transparent text-[11px] font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-wider border-none focus:outline-none cursor-pointer pr-1 font-mono"
              >
                <option value="all" className="text-slate-900 bg-white dark:bg-slate-900">All</option>
                {(availableSessions || ["2024-26", "2025-27", "2026-28", "2027-29"]).map((sess: string) => (
                  <option key={sess} value={sess} className="text-slate-900 bg-white dark:bg-slate-900">{sess}</option>
                ))}
              </select>
            </div>

            {/* Spotlight Command Palette Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-superior-teal/40 text-slate-500 dark:text-slate-400 transition-all duration-200 shadow-2xs group"
              title="Global Spotlight Search (Ctrl + K)"
            >
              <Search size={14} className="text-slate-400 group-hover:text-superior-teal transition-colors" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Search...</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-500 rounded border border-slate-200 dark:border-slate-700 shadow-2xs">
                Ctrl K
              </kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="sm:hidden text-slate-500 hover:text-superior-teal rounded-xl h-9 w-9"
              title="Search (Ctrl + K)"
            >
              <Search size={17} />
            </Button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                const newTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
                if (newTheme === "dark") {
                  document.documentElement.classList.add("dark");
                  safeLocalStorage.setItem("theme", "dark");
                } else {
                  document.documentElement.classList.remove("dark");
                  safeLocalStorage.setItem("theme", "light");
                }
                window.dispatchEvent(new Event('themechange'));
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title="Toggle Dark Mode"
            >
              <svg className="w-4 h-4 hidden dark:block text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <svg className="w-4 h-4 block dark:hidden text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {/* Notifications */}
            {isSuperAdmin && (
              <NotificationPanel
                notifications={data.notifications}
                onMarkRead={data.markNotificationRead}
                onClearAll={data.clearAllNotifications}
              />
            )}

            {/* Executive User Profile Badge */}
            <div
              onClick={() => isAdmin && setIsAccessDialogOpen(true)}
              className={cn(
                "flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-2xs group",
                isAdmin
                  ? "bg-slate-50/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-superior-gold/40 hover:bg-white dark:hover:bg-slate-800"
                  : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700 cursor-default"
              )}
              title={isAdmin ? "Click to manage sub-admins & access" : undefined}
            >
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-inner",
                  isSuperAdmin 
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-amber-500/20" 
                    : isAdmin 
                    ? "bg-gradient-to-br from-[#085a4e] to-emerald-700 text-white shadow-emerald-500/20"
                    : "bg-gradient-to-br from-slate-600 to-slate-800 text-white"
                )}>
                  {userPermission?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800",
                  isSuperAdmin ? "bg-amber-400" : isAdmin ? "bg-emerald-500" : "bg-teal-500"
                )} />
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px] group-hover:text-superior-teal dark:group-hover:text-superior-gold transition-colors">
                  {userPermission?.displayName || user?.email?.split('@')[0] || 'Administrator'}
                </span>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-wider mt-0.5",
                  isSuperAdmin ? "text-amber-600 dark:text-amber-400" : isAdmin ? "text-superior-teal dark:text-emerald-400" : "text-slate-400"
                )}>
                  {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Sub-Admin"}
                </span>
              </div>
            </div>

            {/* Sign Out Button */}
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="group flex items-center gap-1.5 px-3 py-2 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-600 transition-all duration-200 shadow-2xs active:scale-95"
              title="Sign Out of Session"
            >
              <LogOut size={15} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
              <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 group-hover:text-rose-600">
                Sign Out
              </span>
            </Button>
          </div>
        </header>

        {/* Alert Strip - Refined */}
        {defaultersCount > 0 && !hideLedgerAlert && (
          <div className="bg-superior-teal text-white px-10 py-2.5 flex items-center justify-between gap-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-6 h-6 rounded-lg bg-superior-gold/20 flex items-center justify-center text-superior-gold">
                <AlertTriangle size={14} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest leading-none">
                Ledger Alert:{" "}
                <span className="text-superior-gold">
                  {defaultersCount} Defaulters
                </span>{" "}
                detected
              </p>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <button
                onClick={() => handleNavClick("fee-boys")}
                className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg border border-white/10 transition-all"
              >
                Review Ledger →
              </button>
              <button onClick={() => setHideLedgerAlert(true)} className="text-white/50 hover:text-white transition-colors p-1">
                 <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="w-full max-w-full p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              
                <motion.div
                  key={`${activePage}-${activeFilter}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {activePage === "dashboard" && (
                    <DashboardView
                      data={filteredData}
                      setActivePage={handleNavClick}
                      selectedSession={selectedSession}
                      setSelectedSession={setSelectedSession}
                    />
                  )}
                {activePage === "leads" && (
                  <LeadsManagementView
                    data={filteredData}
                    onNavigate={(page, filter) =>
                      handleNavClick(page as Page, filter)
                    }
                  />
                )}
                {activePage.startsWith("admissions") && (
                  <AdmissionsView
                    data={filteredData}
                    initialFilter={activeFilter}
                    selectedSession={selectedSession}
                    program={activePage.includes("-") ? activePage.split("-")[1] : undefined}
                  />
                )}
                {activePage.startsWith("fee") && (
                  <FeeManagementView
                    data={filteredData}
                    gender={
                      activePage === "fee-boys"
                        ? "Male"
                        : activePage === "fee-girls"
                          ? "Female"
                          : undefined
                    }
                    program={
                      activePage.includes("-") ? (activePage === "fee-boys" || activePage === "fee-girls" ? "fsc" : activePage.replace("fee-", "")) : undefined
                    }
                  />
                )}
                {activePage.startsWith("students") && (
                  <StudentsView
                    data={filteredData}
                    gender={
                      activePage === "students-boys"
                        ? "Male"
                        : activePage === "students-girls"
                          ? "Female"
                          : undefined
                    }
                    program={
                      activePage.includes("-") ? (activePage === "students-boys" || activePage === "students-girls" ? "fsc" : activePage.replace("students-", "")) : undefined
                    }
                  />
                )}
                {activePage === "attendance" && (
                  <AttendanceView data={filteredData} />
                )}
                {activePage === "classes" && (
                  <StaffView key="classes" data={filteredData} initialFilter="subjects" title="Classes & Subjects" hideNavigation={true} />
                )}
                {activePage === "timetable" && (
                  <StaffView key="timetable" data={filteredData} initialFilter="timetable" title="Timetable" hideNavigation={true} />
                )}
                {activePage === "staff" && (
                  <StaffView key="staff" data={filteredData} initialFilter={activeFilter} />
                )}
                {activePage === "accounts" && (
                  <AccountsView data={filteredData} initialTab={activeFilter} />
                )}
                {activePage === "reports" && (
                  <ReportsView
                    data={filteredData}
                    initialFilter={activeFilter}
                  />
                )}
                {activePage === "settings" && (
                  <SettingsView data={filteredData} />
                )}
                {activePage === "library" && (
                  <div className="flex h-full items-center justify-center p-8 bg-slate-50 animate-in fade-in zoom-in duration-300">
                    <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center">
                      <div className="w-20 h-20 bg-superior-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <BookOpen size={40} className="text-superior-teal" />
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 mb-2">Library Module</h2>
                      <p className="text-slate-500 mb-6">The robust global library management system is being provisioned and will be activated shortly.</p>
                      <Button variant="outline" className="rounded-xl w-full border-slate-200 hover:bg-slate-50 shadow-sm" onClick={() => handleNavClick("dashboard")}>Return to Dashboard</Button>
                    </div>
                  </div>
                )}
                {activePage === "academic" && (
                  <AcademicView data={filteredData} />
                )}
                {activePage === "whatsapp-center" && (
                  <WhatsAppCenterView data={filteredData} />
                )}
              </motion.div>
              
            </AnimatePresence>
          </div>
        </div>
      </main>

      <AccessControlDialog
        open={isAccessDialogOpen}
        onOpenChange={setIsAccessDialogOpen}
        permissions={data.permissions}
        onUpdate={data.updatePermission}
        onDelete={data.deletePermission}
      />

      {/* Global Spotlight Search (Ctrl + K) */}
      <GlobalCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        data={filteredData}
        onSelectStudent={(student) => {
          setDossierStudent(student);
        }}
        onNavigate={(page, filter) => handleNavClick(page as Page, filter)}
      />

      {/* Universal Student 360° Dossier View */}
      <StudentDossier360
        student={dossierStudent}
        isOpen={Boolean(dossierStudent)}
        onClose={() => setDossierStudent(null)}
        data={filteredData}
        onOpenWhatsApp={(phone) => {
          handleNavClick("whatsapp-center");
        }}
      />

      <Toaster position="top-right" richColors />
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
    </div>
  );
}

// Views are imported from separate files
