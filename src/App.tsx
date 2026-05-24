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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSupabaseData } from "./hooks/useSupabaseData";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
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
  | "timetable";

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
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [brandingSettings, setBrandingSettings] = useState<{
    name: string;
    logo: string | null;
  }>(() => {
    try {
      const savedLogo = localStorage.getItem('college_logo');
      const savedName = localStorage.getItem('college_name');
      return {
        name: savedName || "Superior College",
        logo: savedLogo || null,
      };
    } catch {
      return { name: "Superior College", logo: null };
    }
  });

  // Countdown timer for app loading screen
  React.useEffect(() => {
    if (user && loadingCountdown > 0) {
      const timer = setTimeout(() => {
        setLoadingCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loadingCountdown]);

  // Dark mode init
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
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
          
          try {
            if (logoSource) localStorage.setItem('college_logo', logoSource);
            localStorage.setItem('college_name', finalName);
          } catch(e) {
            console.warn("localStorage sync error:", e);
          }

          // Debugging help - if logo is still not showing but we have data
          if (!logoSource) {
            console.warn("Settings found but no logo source identified:", data);
          }
        } else {
          console.log("No branding settings record found in database.");
        }
      } catch (err) {
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
          if (errMsg.toLowerCase().includes("refresh token")) {
            window.localStorage.removeItem("scj-auth");
            supabase.auth.signOut({ scope: "local" }).catch(() => {});
          } else {
            console.error("Session error:", error);
          }
        }
        setUser(data?.session?.user ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        const errMsg = typeof err === 'string' ? err : (err?.message || String(err));
        if (errMsg.toLowerCase().includes("refresh token")) {
          window.localStorage.removeItem("scj-auth");
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
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
    if (!user && !authLoading && isBrandingLoaded) {
      const timer = setTimeout(() => {
        setShowLoginForm(true);
      }, 2500);
      return () => clearTimeout(timer);
    } else if (user) {
      setShowLoginForm(false);
    }
  }, [user, authLoading, isBrandingLoaded]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoginError(error.message);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear AI Copilot persistent state
      Object.keys(window.localStorage).forEach(key => {
        if (key.startsWith("scj_ai_")) {
          window.localStorage.removeItem(key);
        }
      });
      const { error } = await supabase.auth.signOut();
      if (error) {
        const errMsg = typeof error === 'string' ? error : (error.message || String(error));
        if (errMsg.toLowerCase().includes("refresh token")) {
          window.localStorage.removeItem("scj-auth");
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
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

  const data = useSupabaseData(user);

  // Sync branding once authenticated data is available
  React.useEffect(() => {
    if (data.settings) {
      const logoSource = data.settings.logo;
      if (logoSource) {
        setBrandingSettings((prev) => {
          const newName = data.settings.collegeName || prev.name;
          try {
            localStorage.setItem('college_logo', logoSource);
            localStorage.setItem('college_name', newName);
          } catch(e) {
            console.warn("localStorage sync error:", e);
          }
          return {
            name: newName,
            logo: logoSource,
          };
        });
      } else if (data.settings.collegeName) {
        setBrandingSettings((prev) => {
          try {
            localStorage.setItem('college_name', data.settings.collegeName);
          } catch(e) {
            console.warn("localStorage sync error:", e);
          }
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
  const isSuperAdmin = user?.email ? SUPER_ADMIN_EMAILS.includes(user.email) : false;

  const userPermission = useMemo(
    () => data.permissions.find((p) => p.email === user?.email),
    [data.permissions, user?.email],
  );
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
        "dashboard", "fee", "academic", "attendance", "library", "accounts", "classes", "timetable", "reports", "leads", "admissions", "students", "staff", "settings"
      ]));
    }

    const allowed = (userPermission?.sections || []).filter((s) => {
      const parent = parentMap[s] || s;
      return (
        modulesFromSettings.includes(parent) ||
        parent === "fee" ||
        s === "accounts" ||
        modulesFromSettings.includes("accounts")
      );
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
        "fee-boys": "accounts",
        "fee-girls": "accounts",
        "fee-ukl3": "accounts",
        "fee-dit": "accounts",
        "fee-bs": "accounts",
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
          accounts: "fee-boys",
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
        "fee-boys": "fee-boys",
        "fee-girls": "fee-boys",
        staff: "staff",
        accounts: "accounts",
      }[pageId as string] || null;

    setExpandedMenu(parentMenu || autoParent);
  };

  if (authLoading || (!user && !isBrandingLoaded)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#042e27] via-[#085a4e] to-[#011a15] relative overflow-hidden font-sans">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotateX: 360, rotateZ: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            className="w-[120vw] h-[120vw] lg:w-[80vw] lg:h-[80vw] absolute opacity-30"
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
          >
            <div
              className="absolute inset-10 rounded-full border border-superior-gold/20 shadow-[0_0_100px_rgba(201,168,76,0.1)]"
              style={{ transform: "rotateX(70deg)" }}
            />
          </motion.div>
          <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
          <div className="absolute w-full h-full bg-gradient-to-t from-[#011a15] via-transparent to-transparent z-0" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center">
          {brandingSettings.logo ? (
            <div className="relative mb-10 w-44 h-44 flex items-center justify-center">
               <div className="absolute inset-0 rounded-full overflow-hidden shadow-[0_0_30px_rgba(201,168,76,0.2)] bg-[#011a15]">
                 <motion.img 
                   src={brandingSettings.logo}
                   alt="College Logo"
                   className="w-full h-full object-cover"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ duration: 0.8 }}
                 />
               </div>
               
               {/* Overlay countdown in the center layout style but empty block to match structure */}
               <div className="absolute inset-0 flex items-center justify-center z-20">
                   <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-12 h-12 border-4 border-superior-gold/20 border-t-superior-gold rounded-full shadow-[0_0_15px_rgba(201,168,76,0.5)]"
                   />
               </div>
               
               {/* 360 spinner rings */}
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-[-10px] rounded-full border border-superior-gold/20 border-t-superior-gold/80 shadow-[0_0_20px_rgba(201,168,76,0.3)] z-10"
               />
               <motion.div
                 animate={{ rotate: -360 }}
                 transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-[-24px] rounded-full border border-white/5 border-b-white/30 z-10 pointer-events-none"
               />
            </div>
          ) : (
            <div className="relative mb-10 w-32 h-32 flex flex-col items-center justify-center bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-12 h-12 rounded-full border-4 border-white/10 border-t-superior-gold"
                />
              <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                 className="absolute inset-0 rounded-full border border-superior-gold/20 border-t-superior-gold/80 pointer-events-none"
               />
            </div>
          )}

        <div className="relative z-10 text-center space-y-3">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-[0.2em] uppercase">
            {brandingSettings.name}
          </h2>
          
            <p className="text-superior-gold font-medium text-xs md:text-sm tracking-widest uppercase animate-pulse mt-4">
              Connecting to secure environment...
            </p>
        </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex bg-gradient-to-br from-[#021c17] via-[#053229] to-[#011410] relative overflow-hidden font-sans select-none">
        {/* Animated 3D Welcome Background with majestic curves */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="w-[140vw] h-[140vw] lg:w-[100vw] lg:h-[100vw] absolute opacity-20 pointer-events-none"
          >
            <div
              className="absolute inset-10 rounded-full border border-superior-gold/10 shadow-[0_0_120px_rgba(201,168,76,0.05)]"
            />
            <div
              className="absolute inset-40 rounded-full border-2 border-white/[0.02]"
            />
          </motion.div>
          {/* Majestic background circles and arc matching the screenshot */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-superior-gold/10 z-0 pointer-events-none hidden md:block" />
          <div className="absolute right-[-100px] top-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full border border-white/[0.02] z-0 pointer-events-none hidden md:block" />
          
          {/* Glowing particle stars matching screenshot precisely */}
          <div className="absolute top-[35%] left-[45%] w-1.5 h-1.5 bg-superior-gold/80 rounded-full shadow-[0_0_12px_#c9a84c] z-0 pointer-events-none animate-pulse" />
          <div className="absolute bottom-[28%] left-[43%] w-1.5 h-1.5 bg-superior-gold/80 rounded-full shadow-[0_0_12px_#c9a84c] z-0 pointer-events-none animate-pulse" />
          <div className="absolute top-[62%] right-[10%] w-1 h-1 bg-white/60 rounded-full shadow-[0_0_8px_#ffffff] z-0 pointer-events-none animate-ping" />
          
          <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />
          <div className="absolute w-full h-full bg-gradient-to-t from-[#011410] via-transparent to-transparent z-0" />
        </div>

        {/* The Welcome Content - custom layout */}
        <motion.div
          animate={{
            scale: showLoginForm ? 0.95 : 1,
            opacity: showLoginForm ? 0.9 : 1,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 100 }}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-10 transition-all duration-700 text-white p-6 md:p-12",
            showLoginForm
              ? "w-full md:w-[55%] xl:w-[65%] md:left-[45%] xl:left-[35%] hidden md:flex"
              : "w-full left-0",
          )}
        >
          {/* Large Logo layout shown during initial countdown screen of 2.5s */}
          {!showLoginForm && (
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative mb-8 md:mb-12"
            >
              <div className="w-32 h-32 md:w-44 md:h-44 bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_2px_5px_rgba(255,255,255,0.1)] flex items-center justify-center relative overflow-hidden p-1">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-4">
                  {brandingSettings.logo ? (
                    <img
                      src={brandingSettings.logo}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-full"
                    />
                  ) : (
                    <School
                      size={60}
                      className="text-[#053229]"
                    />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-superior-gold/15 blur-[40px] rounded-full" />
            </motion.div>
          )}

          <div className="text-center sm:text-left md:max-w-2xl xl:max-w-3xl relative z-10">
            <div>
              {/* Display text styled exactly like the screenshot with elegant styling */}
              <h1 className="text-4xl md:text-5xl xl:text-7xl font-sans font-black tracking-tight leading-[1.1] text-white">
                Welcome to
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-superior-gold via-yellow-400 to-[#e3c16f]">
                  {brandingSettings.name || "Superior College"}
                </span>
                {!(brandingSettings.name || "").toLowerCase().includes("jahanian") && (
                  <>
                    <br />
                    Jahanian
                  </>
                )}
              </h1>
            </div>

            <div>
              {/* Gold Graduation Cap divider matching the screenshot */}
              <div className="flex items-center gap-4 w-full max-w-xl my-6">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-superior-gold/40" />
                <GraduationCap className="text-superior-gold w-6 h-6 shrink-0 filter drop-shadow-[0_0_8px_rgba(201,168,76,0.6)]" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-superior-gold/40" />
              </div>
              
              <p className="text-sm md:text-base text-white/60 font-medium leading-relaxed max-w-xl mb-8">
                Experience the next generation of academic management. Secure, 
                unified ecosystem for students, staff, and administration. 
                Streamlined operations at your fingertips, crafted for excellence.
              </p>

              {/* Grid with 3 columns matching second half of first screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 w-full max-w-2xl">
                {[
                  {
                    icon: Shield,
                    title: "Enterprise Security",
                    desc: "Advanced protection for your data"
                  },
                  {
                    icon: Zap,
                    title: "Lightning Fast",
                    desc: "Optimized for speed and performance"
                  },
                  {
                    icon: Database,
                    title: "Real-time Sync",
                    desc: "Always up-to-date information"
                  }
                ].map((feat, i) => (
                  <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shadow-black/20 hover:border-superior-gold/30 hover:bg-white/10 transition-all duration-300">
                      <feat.icon className="text-superior-gold w-5 h-5 filter drop-shadow-[0_0_4px_rgba(201,168,76,0.5)]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-widest uppercase">{feat.title}</h3>
                      <p className="text-[11px] text-white/50 mt-1 leading-normal font-medium">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!showLoginForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex items-center gap-4 justify-center sm:justify-start text-superior-gold text-[10px] md:text-xs font-black uppercase tracking-[0.3em]"
              >
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-superior-gold rounded-full shadow-[0_0_10px_rgba(201,168,76,0.8)]"
                />
                Initializing Secure Access
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="w-2 h-2 bg-superior-gold rounded-full shadow-[0_0_10px_rgba(201,168,76,0.8)]"
                />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* The Login Panel - floating glassmorphic card on the left */}
        <AnimatePresence>
          {showLoginForm && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 120,
              }}
              className="absolute md:fixed top-0 left-0 w-full md:w-[45%] xl:w-[35%] h-full z-20 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8"
            >
              {/* Glassmorphic card design matching the screenshot precisely */}
              <div className="w-full max-w-[420px] bg-[#03241e]/75 border border-white/10 rounded-[2.5rem] shadow-[0_45px_100px_-15px_rgba(0,0,0,0.85),inset_0_1px_2px_rgba(255,255,255,0.15)] p-6 md:p-8 relative overflow-hidden backdrop-blur-2xl">
                {/* Subtle internal glowing spots */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-superior-gold/5 blur-[50px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-superior-teal/10 blur-[50px] rounded-full pointer-events-none" />

                <div className="mb-6 text-center">
                  {/* Glowing Logo Circle */}
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center p-1.5 border-2 border-superior-gold/40 shadow-[0_0_20px_rgba(201,168,76,0.3)] mx-auto mb-3.5 relative">
                    {brandingSettings.logo ? (
                      <img
                        src={brandingSettings.logo}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-full"
                      />
                    ) : (
                      <School
                        size={36}
                        className="text-[#053229]"
                      />
                    )}
                  </div>

                  <h2 className="text-xl md:text-2xl font-sans font-black text-white uppercase tracking-[0.1em] mt-2 mb-1">
                    Superior
                  </h2>
                  <p className="text-xs font-bold text-superior-gold tracking-[0.2em] uppercase">
                    Staff Portal
                  </p>
                  
                  {/* Spacer divider */}
                  <div className="h-[2px] w-10 bg-superior-gold/30 rounded-full mx-auto my-3" />

                  {/* Secure connection sub-badge */}
                  <div className="flex items-center gap-1.5 justify-center bg-[#053229]/50 border border-white/5 px-2.5 py-1 rounded-full w-fit mx-auto">
                    <Shield size={11} className="text-superior-gold shrink-0" />
                    <span className="text-[9px] font-black text-white/75 uppercase tracking-widest leading-none">
                      Secure Access • Trusted Platform
                    </span>
                  </div>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="space-y-4 flex flex-col border-none bg-transparent shadow-none p-0"
                >
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 text-red-100 text-[10px] font-bold p-3.5 rounded-xl border border-red-500/20 uppercase tracking-widest flex items-start gap-2.5 backdrop-blur-md"
                    >
                      <AlertTriangle
                        size={14}
                        className="shrink-0 mt-0.5 text-red-500"
                      />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    {/* Admin Email container */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                        Admin Email
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <Input
                          placeholder="admin@superior.edu"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-12 bg-black/30 border border-white/10 text-white placeholder:text-white/20 h-13 rounded-xl focus:border-superior-gold/40 focus:ring-1 focus:ring-superior-gold/40 text-sm font-medium backdrop-blur-md w-full"
                        />
                      </div>
                    </div>

                    {/* Password container */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-white/50 uppercase tracking-widest ml-1">
                        Password
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                        <Input
                          placeholder="Enter Secure Key"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-12 pr-12 bg-black/30 border border-white/10 text-white placeholder:text-white/20 h-13 rounded-xl focus:border-superior-gold/40 focus:ring-1 focus:ring-superior-gold/40 text-sm font-medium backdrop-blur-md w-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember me and Forgot Password */}
                  <div className="flex items-center justify-between px-1 text-xs">
                    <label className="flex items-center gap-2 text-white/50 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-white/10 bg-black/20 focus:ring-0 checked:bg-superior-gold checked:border-superior-gold h-4 w-4 shrink-0"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => toast.info("Contact management to change administrator password.")}
                      className="text-superior-gold hover:text-yellow-400 font-bold tracking-wide transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* SIGN IN Button with Gradient */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-superior-gold to-[#b7953d] hover:brightness-110 text-slate-950 mt-4 h-13 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-[0_8px_20px_rgba(201,168,76,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                  >
                    SIGN IN
                    <LogIn size={14} className="stroke-[3]" />
                  </Button>

                  {/* Divider line OR */}
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-[1px] flex-1 bg-white/5" />
                    <span className="text-[9px] text-white/25 font-bold tracking-widest uppercase">
                      OR
                    </span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                  </div>

                  {/* LOGIN WITH SECURE KEY */}
                  <button
                    type="button"
                    onClick={() => toast.info("Secure physical safety credentials is set to SuperAdmin control.")}
                    className="w-full bg-white/[0.03] hover:bg-white/[0.08] text-white/90 border border-white/10 transition-all duration-200 h-13 rounded-xl text-xs font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Shield size={14} className="text-superior-gold shrink-0" />
                    LOGIN WITH SECURE KEY
                  </button>

                  {/* Padd lock footer description */}
                  <div className="flex items-center gap-2 justify-center pt-4 text-white/30 text-[10px] font-medium tracking-wide">
                    <Lock size={11} className="text-superior-gold" />
                    <span>Your data is protected with enterprise-grade security</span>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-[#021c17] via-[#053229] to-[#011410] relative overflow-hidden font-sans select-none">
        {/* Animated Background effects */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="w-[140vw] h-[140vw] lg:w-[100vw] lg:h-[100vw] absolute opacity-15 pointer-events-none"
          >
            <div className="absolute inset-20 rounded-full border border-superior-teal/30 shadow-[0_0_80px_rgba(8,90,78,0.15)]" />
            <div className="absolute inset-40 rounded-full border border-superior-gold/5" />
          </motion.div>
          
          {/* Subtle glowing spheres in the background */}
          <div className="absolute top-[20%] left-[25%] w-80 h-80 bg-superior-teal/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[20%] right-[25%] w-80 h-80 bg-superior-gold/5 blur-[100px] rounded-full pointer-events-none animate-pulse" />
          
          <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay" />
          <div className="absolute w-full h-full bg-gradient-to-t from-[#011a15] via-transparent to-transparent z-0" />
        </div>

        {/* Outer relative wrapper container */}
        <div className="relative z-10 flex flex-col items-center justify-center px-4 w-full max-w-2xl">
          
          {/* Main Logo Sphere */}
          <div className="relative mb-8 w-40 h-40 flex items-center justify-center">
            {/* Glowing inner rings */}
            <div className="absolute inset-2 rounded-full border border-superior-gold/30 shadow-[0_0_40px_rgba(201,168,76,0.35)] animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-white/5 border-t-superior-gold shadow-[0_0_30px_rgba(201,168,76,0.2)] bg-[#011a15] overflow-hidden p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-3">
                {brandingSettings.logo ? (
                  <img src={brandingSettings.logo} alt="Logo" className="w-full h-full object-contain rounded-full" />
                ) : (
                  <School size={72} className="text-[#053229]" />
                )}
              </div>
            </div>
            {/* Countdown HUD Center Overlaid */}
            {loadingCountdown > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-slate-900/90 border border-superior-gold/50 rounded-full w-10 h-10 flex items-center justify-center z-20 shadow-lg text-superior-gold font-sans font-black text-sm">
                {loadingCountdown}s
              </div>
            )}
            
            {/* Rotating Outer Rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-12px] rounded-full border border-superior-gold/25 border-t-superior-gold/90"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-24px] rounded-full border border-white/5 border-b-white/30 pointer-events-none"
            />
          </div>

          {/* Heading Text display */}
          <div className="text-center space-y-1 mt-2">
            <h1 className="text-xs md:text-sm font-bold text-superior-gold tracking-[0.3em] uppercase">
              {brandingSettings.name || "Superior College"}
            </h1>
            {!(brandingSettings.name || "").toLowerCase().includes("jahanian") && (
              <h2 className="text-3xl md:text-5xl font-sans font-black text-white tracking-[0.1em] uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                Jahanian
              </h2>
            )}
          </div>

          {/* Graduation Cap Lines Divider */}
          <div className="flex items-center gap-3 w-56 my-4 mx-auto">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-superior-gold/40" />
            <GraduationCap className="text-superior-gold w-4.5 h-4.5 shrink-0 filter drop-shadow-[0_0_4px_#c9a84c]" />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-superior-gold/40" />
          </div>

          {/* Welcome subtitle message with Name Highlighted in Gold */}
          {user && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs md:text-sm text-white/60 font-medium tracking-wide mb-6"
            >
              Welcome back, <span className="text-superior-gold font-black shadow-superior-gold/10 drop-shadow">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Admin"}</span>! Logging you in...
            </motion.p>
          )}

          {/* Premium Glazzmorphic Checklist / Stepper Card */}
          <div className="relative z-10 w-full max-w-xl bg-[#03241e]/75 border border-white/10 rounded-[2rem] p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-xl mt-4">
            {/* Steps line horizontal layout */}
            <div className="flex items-center justify-between relative mb-8 px-4">
              {/* Connecting line behind icons */}
              <div className="absolute top-[22px] left-10 right-10 h-[2px] bg-white/5 z-0 rounded-full">
                <motion.div
                  className="h-full bg-gradient-to-r from-superior-gold to-yellow-400"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, (Math.max(0, 5 - loadingCountdown - 1) / 3) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {steps.map((st) => {
                const currentProgressIndex = 5 - loadingCountdown; // steps counts up: 0,1,2,3,4,5
                const isCompleted = currentProgressIndex >= st.id;
                const isActive = currentProgressIndex === st.id - 1;
                const isPending = currentProgressIndex < st.id - 1;

                return (
                  <div key={st.id} className="flex flex-col items-center z-10 relative flex-1">
                    <motion.div
                      animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={cn(
                        "w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 shadow-md",
                        isCompleted
                          ? "bg-superior-gold border-superior-gold text-slate-950"
                          : isActive
                          ? "bg-[#053229] border-superior-gold text-superior-gold shadow-[0_0_15px_rgba(201,168,76,0.5)]"
                          : "bg-[#021814]/80 border-white/5 text-white/30"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="stroke-[3]" />
                      ) : (
                        <st.icon size={16} className={cn(isActive && "animate-pulse")} />
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        "text-[9px] font-black tracking-wider uppercase mt-3 transition-colors duration-300",
                        isCompleted ? "text-white" : isActive ? "text-superior-gold" : "text-white/30"
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dynamic system percentage loader in gold gradient bar */}
            <div className="space-y-2 px-2 mt-6">
              <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-[#c9a84c] uppercase">
                <span>Enterprise Core System</span>
                <span>{currentPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#e3c16f] via-superior-gold to-yellow-400 shadow-[0_0_10px_rgba(201,168,76,0.5)] rounded-full"
                  initial={{ width: "15%" }}
                  animate={{ width: `${currentPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Shield safety caption */}
          <div className="flex items-center gap-1.5 mt-8 text-white/40 text-[10px] uppercase font-black tracking-widest">
            <Shield size={12} className="text-superior-gold shrink-0" />
            <span>Secure Connection • Protecting Your Workspace</span>
          </div>

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
              initial={{ x: -250 }}
              animate={{ x: 0 }}
              exit={{ x: -250 }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[250px] bg-[#053229] text-white z-50 flex flex-col shadow-[20px_0_40px_rgba(0,0,0,0.6)] border-r border-white/[0.04] overflow-hidden"
            >
              {/* Premium Minimalist Background Effects */}
              <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-superior-gold/[0.06] to-transparent z-0 pointer-events-none" />
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-superior-gold/[0.05] rounded-full blur-[100px] z-0 pointer-events-none" />

              <div className="px-4 py-3 h-14 flex items-center justify-between relative z-10 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-superior-gold/45 to-transparent p-[1px] flex items-center justify-center flex-shrink-0 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center p-0.5">
                      {brandingSettings.logo ? (
                        <img
                          src={brandingSettings.logo}
                          alt="Logo"
                          className="w-full h-full rounded-full object-contain"
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
                        <School size={16} className="text-superior-teal" />
                      )}
                    </div>
                  </div>
                  <div className="overflow-hidden text-left flex flex-col justify-center">
                    <h1 className="font-sans font-bold text-[14px] leading-tight tracking-wide text-white/95">
                      {settings?.collegeName
                        ?.split(" ")
                        .map((w: string) => w[0])
                        .join("") || "SCJ"}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-superior-gold animate-pulse" />
                      <p className="text-[8px] text-white/60 font-mono tracking-widest font-bold uppercase">
                        Workspace
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white/30 hover:text-white hover:bg-white/5 rounded-lg h-7 w-7"
                >
                  <X size={14} />
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
                </nav>
              </ScrollArea>

              <div className="p-2.5 relative z-10 bg-transparent border-t border-white/[0.04]">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-superior-gold/80 to-yellow-600/80 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      {(user?.user_metadata?.full_name || "Admin")[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-white/90 truncate max-w-[100px]">
                        {user?.user_metadata?.full_name || "System Admin"}
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
        <header className="h-20 bg-white dark:bg-slate-900 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-500 hover:text-superior-teal hover:bg-slate-50 rounded-xl h-10 w-10 transition-all active:scale-90"
            >
              <Menu size={22} />
            </Button>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
              <div className="w-1.5 h-1.5 rounded-full bg-superior-gold shadow-[0_0_8px_rgba(201,168,76,0.5)]" />
              <h2 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.25em]">
                {activePage.replace("-", " ")}
              </h2>
            </div>
          </div>

          {/* Shortcut Modules Floating Bar */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-2 p-1 bg-transparent border-none">
              {[
                { id: "dashboard", label: "Dashboard", Icon: Home, color: "text-blue-500", shadow: "drop-shadow-[0_4px_6px_rgba(59,130,246,0.6)]" },
                { id: "leads", label: "Marketing", Icon: Sparkles, color: "text-pink-500", shadow: "drop-shadow-[0_4px_6px_rgba(236,72,153,0.6)]" },
                { id: "admissions", label: "Admissions", Icon: Layers, color: "text-purple-500", shadow: "drop-shadow-[0_4px_6px_rgba(168,85,247,0.6)]" },
                { id: "students", label: "Students", Icon: Users, color: "text-emerald-500", shadow: "drop-shadow-[0_4px_6px_rgba(16,185,129,0.6)]" },
                { id: "staff", label: "Staff", Icon: Briefcase, color: "text-amber-500", shadow: "drop-shadow-[0_4px_6px_rgba(245,158,11,0.6)]" },
                { id: "fee", label: "Accounts", Icon: Wallet, color: "text-teal-500", shadow: "drop-shadow-[0_4px_6px_rgba(20,184,166,0.6)]" },
                { id: "academic", label: "Academic", Icon: GraduationCap, color: "text-indigo-500", shadow: "drop-shadow-[0_4px_6px_rgba(99,102,241,0.6)]" },
                { id: "attendance", label: "Attendance", Icon: CheckCircle2, color: "text-green-500", shadow: "drop-shadow-[0_4px_6px_rgba(34,197,94,0.6)]" },
                { id: "reports", label: "Reports", Icon: BarChart3, color: "text-rose-500", shadow: "drop-shadow-[0_4px_6px_rgba(244,63,94,0.6)]" },
                { id: "settings", label: "Settings", Icon: SettingsIcon, color: "text-slate-600 dark:text-slate-300", shadow: "drop-shadow-[0_4px_6px_rgba(100,116,139,0.6)]" },
              ]
                .map((mod) => {
                  const isActive = activePage === mod.id || activePage.startsWith(mod.id);
                  return (
                    <div key={mod.id} className="relative group flex items-center justify-center">
                      <motion.button
                        whileHover={{ scale: 1.15, y: -4, rotate: 2 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                        onClick={() => handleNavClick(mod.id as Page)}
                        className={cn(
                          "flex items-center justify-center w-[46px] h-[46px] rounded-[16px] transition-all duration-300 relative",
                          isActive
                            ? `bg-white/80 dark:bg-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-white/50 dark:border-slate-700/50 ring-2 ring-white/20 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-900`
                            : "bg-white/20 dark:bg-slate-800/20 backdrop-blur-md border border-white/30 dark:border-slate-700/30 hover:bg-white/60 dark:hover:bg-slate-800/60 shadow-sm"
                        )}
                      >
                        <mod.Icon 
                          size={22} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={cn(
                            "transition-all duration-300",
                            isActive 
                              ? `${mod.color} ${mod.shadow} scale-110` 
                              : `text-slate-500 dark:text-slate-400 group-hover:${mod.color} group-hover:${mod.shadow} group-hover:scale-110`
                          )}
                        />
                      </motion.button>
                      
                      {/* Tooltip */}
                      <div className="absolute top-[56px] left-1/2 -translate-x-1/2 px-3 py-1.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold tracking-widest rounded-[8px] opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[60] whitespace-nowrap shadow-xl">
                        {mod.label}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="group flex items-center gap-2 px-4 py-2.5 rounded-2xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-600 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95"
            >
              <LogOut size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-rose-500 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400 group-hover:text-rose-700 dark:group-hover:text-rose-400">
                Sign Out
              </span>
            </Button>

            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2" />

            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <NotificationPanel
                  notifications={data.notifications}
                  onMarkRead={data.markNotificationRead}
                  onClearAll={data.clearAllNotifications}
                />
              )}

              <button
                onClick={() => {
                  const newTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
                  if (newTheme === "dark") {
                    document.documentElement.classList.add("dark");
                    localStorage.setItem("theme", "dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                    localStorage.setItem("theme", "light");
                  }
                  // Force a re-render for icon if needed, or we can just use CSS to show/hide icons
                  window.dispatchEvent(new Event('themechange'));
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-amber-300 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark Mode"
              >
                <svg className="w-4 h-4 hidden dark:block text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <svg className="w-4 h-4 block dark:hidden text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </button>

              <div
                onClick={() => isAdmin && setIsAccessDialogOpen(true)}
                className={cn(
                  "flex items-center gap-3 ml-2 pl-3 py-1 pr-1 border border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-superior-gold/30 transition-all cursor-pointer group shadow-sm",
                  !isAdmin &&
                    "cursor-default border-slate-100 dark:border-slate-700 grayscale opacity-60",
                )}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-300 leading-none uppercase tracking-widest group-hover:text-superior-teal dark:group-hover:text-superior-gold">
                    {isAdmin
                      ? "Master Admin"
                      : userPermission?.displayName || "Sub Admin"}
                  </p>
                </div>
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl border-2 border-superior-gold flex items-center justify-center text-[10px] font-black text-superior-teal bg-superior-gold/10 shadow-sm",
                  )}
                >
                  {isAdmin
                    ? "AD"
                    : userPermission?.displayName?.[0] || "U"}
                </div>
              </div>
            </div>
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

      <Toaster position="top-right" richColors />
      <style dangerouslySetInnerHTML={{ __html: themeStyles }} />
    </div>
  );
}

// Views are imported from separate files
