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
  <div className="mt-6 mb-2">
    <h3 className="px-6 text-[10px] font-medium text-white/30 uppercase tracking-[0.15em] mb-2">
      {title}
    </h3>
    {children}
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
    <div className="mb-0.5">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          if (subItems && onToggleMenu) onToggleMenu(id);
          else if (onNavClick) onNavClick(id as Page, null, null);
        }}
        className={cn(
          "w-full flex items-center justify-between px-6 py-2.5 transition-all duration-200 group relative",
          isActive
            ? "bg-white/10 text-white border-l-[2.5px] border-superior-gold"
            : "text-white/60 hover:bg-white/8 hover:text-white",
        )}
      >
        {isActive && (
          <motion.div
            layoutId="nav-active-box"
            className="absolute inset-0 border-2 border-superior-gold/30 bg-white/5 pointer-events-none"
            initial={false}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <div className="flex items-center gap-3 relative z-10">
          <Icon
            size={18}
            className={cn(
              isActive ? "text-white" : "text-white/40 group-hover:text-white",
            )}
          />
          <span className="font-medium text-[13px]">{label}</span>
        </div>
        {subItems && (
          <div
            className={cn(
              "transition-transform duration-200 relative z-10",
              isExpanded ? "rotate-180" : "",
            )}
          >
            <ChevronDown size={14} className="opacity-40" />
          </div>
        )}
      </motion.button>

      {subItems && isExpanded && (
        <div className="bg-black/10 py-1">
          {subItems.map((sub, idx) => (
            <button
              key={`${sub.id}-${idx}`}
              onClick={() => onNavClick && onNavClick(sub.id, sub.filter, id)}
              className={cn(
                "w-full text-left pl-14 pr-6 py-2 text-[12px] transition-all duration-200",
                activePage === sub.id &&
                  (activeFilter === sub.filter ||
                    (!activeFilter && !sub.filter))
                  ? "text-superior-gold font-medium"
                  : "text-white/40 hover:text-white hover:bg-white/5",
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
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
  const [isBrandingLoaded, setIsBrandingLoaded] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [brandingSettings, setBrandingSettings] = useState<{
    name: string;
    logo: string | null;
  }>({
    name: "Superior College",
    logo: null,
  });

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
          setBrandingSettings({
            name: data.college_name || data.name || "Superior College",
            logo: logoSource || null,
          });

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
        setBrandingSettings((prev) => ({
          name: data.settings.collegeName || prev.name,
          logo: logoSource,
        }));
      } else if (data.settings.collegeName) {
        setBrandingSettings((prev) => ({
          ...prev,
          name: data.settings.collegeName,
        }));
      }
    }
  }, [data.settings]);

  // All Unique Sessions from Data
  const availableSessions = useMemo(() => {
    const sessionSet = new Set<string>();

    // Add default common sessions (Removed 2026-2028 from system)
    ["2024-26", "2025-27", "2026-28", "2027-29"].forEach((s) =>
      sessionSet.add(s.trim()),
    );

    // Add sessions from settings
    if (data.settings?.academicSession) {
      sessionSet.add(data.settings.academicSession.trim());
    }

    // Add sessions found in records
    data.admissions.forEach(
      (a) => a.session && sessionSet.add(a.session.trim()),
    );
    data.students.forEach((s) => s.session && sessionSet.add(s.session.trim()));
    data.incomes.forEach((i) => i.session && sessionSet.add(i.session.trim()));
    data.expenses.forEach((e) => e.session && sessionSet.add(e.session.trim()));

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
      // On initial load, we might want to default to 'all' if the academicSession results in 0 items
      // But for now, let's just set it and let DashboardView handle the "No Data" suggestion
      setSelectedSession(data.settings.academicSession);
      hasLoadedSettingsInitial.current = true;
    }
  }, [data.settings?.academicSession]);

  // Filtered Data based on session
  const filteredData = useMemo(() => {
    const filterBySession = (list: any[]) => {
      // Show everything if 'all' is selected
      if (selectedSession === "all") return list;

      // Strict matching for session with trim
      return list.filter(
        (item) =>
          (item.session || "").trim() === (selectedSession || "").trim(),
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
      // Action wrappers to inject session
      addLead: (lead: any) =>
        data.addLead({ ...lead, session: selectedSession }),
      addAdmission: (admission: any) =>
        data.addAdmission({ ...admission, session: selectedSession }),
      addStudent: (student: any) =>
        data.addStudent({ ...student, session: selectedSession }),
      addExpense: (expense: any) =>
        data.addExpense({ ...expense, session: selectedSession }),
      addIncome: (income: any) =>
        data.addIncome({ ...income, session: selectedSession }),
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

  const SUPER_ADMIN_EMAIL = "mughalazam1964@gmail.com";
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

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

  if (authLoading || !isBrandingLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#042e27] via-[#085a4e] to-[#011a15] relative overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 rounded-full border-4 border-white/10 border-t-superior-gold"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex bg-gradient-to-br from-[#042e27] via-[#085a4e] to-[#011a15] relative overflow-hidden font-sans">
        {/* Animated 3D Welcome Background */}
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
            <div
              className="absolute inset-20 rounded-[30%] border border-superior-teal/40 shadow-[0_0_80px_rgba(8,90,78,0.3)]"
              style={{ transform: "rotateY(60deg) rotateZ(45deg)" }}
            />
            <div
              className="absolute inset-40 rounded-full border-2 border-white/5"
              style={{ transform: "rotateZ(30deg) scale(0.8)" }}
            />
          </motion.div>
          <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
          <div className="absolute w-full h-full bg-gradient-to-t from-[#011a15] via-transparent to-transparent z-0" />
        </div>

        {/* The Welcome Content - slides to right when login form appears */}
        <motion.div
          animate={{
            scale: showLoginForm ? 0.9 : 1,
            opacity: showLoginForm ? 0.9 : 1,
          }}
          transition={{ type: "spring", damping: 30, stiffness: 100 }}
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center z-10 transition-all duration-700 text-white",
            showLoginForm
              ? "w-full md:w-[55%] xl:w-[65%] md:left-[45%] xl:left-[35%] hidden md:flex"
              : "w-full left-0",
          )}
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative mb-8 md:mb-12"
          >
            <div className="w-32 h-32 md:w-48 md:h-48 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] flex items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              {brandingSettings.logo ? (
                <img
                  src={brandingSettings.logo}
                  alt="Logo"
                  className="w-full h-full object-cover relative z-10"
                />
              ) : (
                <School
                  size={80}
                  className="text-superior-gold filter drop-shadow-lg relative z-10 w-16 h-16 md:w-24 md:h-24"
                />
              )}
            </div>
            <div className="absolute -bottom-10 -right-10 w-24 h-24 md:w-32 md:h-32 bg-superior-gold/20 blur-[50px] rounded-full" />
          </motion.div>

          <motion.div className="text-center p-6 md:p-8 max-w-[90%] md:max-w-xl xl:max-w-3xl backdrop-blur-sm bg-black/10 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-superior-teal/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div>
              <h1 className="text-3xl md:text-5xl xl:text-7xl font-black mb-4 md:mb-6 tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 leading-tight">
                Welcome to
                <br />
                {brandingSettings.name}
              </h1>
            </div>

            <div>
              <p className="text-lg md:text-xl xl:text-2xl text-superior-gold font-medium tracking-[0.2em] uppercase mb-3 md:mb-4 flex items-center justify-center gap-3">
                <span className="h-[2px] w-6 md:w-12 bg-superior-gold/50 rounded-full hidden sm:block" />
                Academic Portal
                <span className="h-[2px] w-6 md:w-12 bg-superior-gold/50 rounded-full hidden sm:block" />
              </p>
              
              <p className="text-sm md:text-base xl:text-lg text-white/60 font-medium leading-relaxed max-w-xl mx-auto mb-6">
                Experience the next generation of academic management. Secure, 
                A unified ecosystem for students, staff, and administration. 
                Streamlined operations at your fingertips, crafted for excellence.</p>

              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mt-6">
                {[
                  { icon: Shield, text: "Enterprise Security" },
                  { icon: Zap, text: "Lightning Fast" },
                  { icon: Database, text: "Real-time Sync" }
                ].map((feature, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-full backdrop-blur-md"
                  >
                    <feature.icon size={14} className="text-superior-gold" />
                    <span className="text-[10px] md:text-xs font-bold text-white/80 uppercase tracking-wider">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {!showLoginForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 md:mt-12 flex items-center gap-4 justify-center text-superior-gold text-[10px] md:text-xs font-black uppercase tracking-[0.3em]"
              >
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 bg-superior-gold rounded-full shadow-[0_0_10px_rgba(201,168,76,0.8)]"
                />
                Initializing Workspace
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="w-2 h-2 bg-superior-gold rounded-full shadow-[0_0_10px_rgba(201,168,76,0.8)]"
                />
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* The Login Panel */}
        <AnimatePresence>
          {showLoginForm && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 150,
                duration: 0.5,
              }}
              className="absolute top-0 left-0 w-full md:w-[45%] xl:w-[35%] h-full z-20 flex flex-col items-center justify-center relative overflow-hidden shadow-[30px_0_100px_rgba(0,0,0,0.5)] bg-white/5 backdrop-blur-2xl border-r border-white/10"
            >
              {/* Decorative Side Panel Elements */}
              <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-superior-gold/30 to-transparent" />
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-superior-teal/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="w-full max-w-[420px] p-6 md:p-8 xl:p-12 relative z-10 scale-95 md:scale-100">
                <div className="mb-8 md:mb-10 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl xl:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-3">
                    Superior
                    <br />
                    <span className="text-superior-gold">Staff Portal</span>
                  </h2>
                  <div className="h-1 w-16 bg-superior-gold rounded-full mx-auto md:mx-0 mb-4" />
                  <p className="text-xs md:text-sm text-white/50 font-medium leading-relaxed">
                    Please sign in with your
                    <br />
                    <span className="text-white font-bold uppercase tracking-wider text-[10px] md:text-xs shadow-white/10 drop-shadow">
                      Secure Credentials
                    </span>
                  </p>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="space-y-6 flex flex-col border-none bg-transparent shadow-none p-0"
                >
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/20 text-red-100 text-[11px] font-bold p-4 rounded-xl border border-red-500/30 uppercase tracking-wide flex items-start gap-3 backdrop-blur-md"
                    >
                      <AlertTriangle
                        size={16}
                        className="shrink-0 mt-0.5 text-red-400"
                      />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">
                        Admin Email
                      </label>
                      <Input
                        placeholder="Example: admin@superior.edu"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-14 rounded-2xl focus:ring-2 focus:ring-superior-gold/50 focus:border-superior-gold/50 transition-all text-sm font-medium backdrop-blur-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-1">
                        Password
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="Enter Secure Key"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-14 pr-12 rounded-2xl focus:ring-2 focus:ring-superior-gold/50 focus:border-superior-gold/50 transition-all text-sm font-medium backdrop-blur-md"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-superior-gold hover:bg-yellow-500 text-slate-900 mt-4 h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(201,168,76,0.3)] hover:shadow-[0_15px_40px_rgba(201,168,76,0.4)] active:scale-[0.98] transition-all"
                  >
                    Initialize Access
                  </Button>

                  {/* Mobile Only Help Text */}
                  <div className="mt-8 text-center lg:hidden">
                    <p className="text-[10px] text-white/40 font-medium uppercase tracking-[0.1em]">
                      {brandingSettings.name} • Official
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (data.loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-superior-teal gap-8 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-superior-gold/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* Animated Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-4 border-2 border-dashed border-white/20 rounded-full"
          />

          <motion.div className="w-56 h-56 rounded-full bg-white flex items-center justify-center shadow-3xl relative z-10 border-8 border-white overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.5)]">
            {brandingSettings.logo ? (
              <img
                src={brandingSettings.logo}
                alt="Branding"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as any).style.display = "none";
                  const parent = (e.target as any).parentElement;
                  if (parent && !parent.querySelector(".fallback-icon")) {
                    parent.innerHTML =
                      '<div class="fallback-icon flex items-center justify-center text-superior-teal"><svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m3 12 8-4h2l8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg></div>';
                  }
                }}
              />
            ) : (
              <School size={80} className="text-superior-teal" />
            )}
          </motion.div>
        </motion.div>

        <div className="space-y-4 text-center relative z-10">
          <div className="space-y-1">
            <h2 className="text-white font-display font-black text-3xl uppercase tracking-[0.1em]">
              {brandingSettings.name}
            </h2>
            <p className="text-superior-gold text-[12px] font-black uppercase tracking-[0.6em] ml-1">
              Academic Portal
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-superior-gold shadow-[0_0_10px_rgba(201,168,76,0.8)]"
              />
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em]">
                Syncing Records
              </p>
            </div>

            <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-superior-gold to-yellow-400 shadow-[0_0_15px_rgba(201,168,76,0.5)]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
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
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-superior-teal text-white z-50 flex flex-col shadow-2xl"
            >
              {/* Sidebar Pattern Overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

              <div className="p-8 h-24 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xl shadow-black/20 transform rotate-3 overflow-hidden">
                    {brandingSettings.logo ? (
                      <img
                        src={brandingSettings.logo}
                        alt="Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = "none";
                          const parent = (e.target as any).parentElement;
                          if (
                            parent &&
                            !parent.querySelector(".fallback-icon")
                          ) {
                            parent.innerHTML =
                              '<div class="fallback-icon flex items-center justify-center text-superior-teal"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m3 12 8-4h2l8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg></div>';
                          }
                        }}
                      />
                    ) : (
                      <School size={24} className="text-superior-teal" />
                    )}
                  </div>
                  <div className="overflow-hidden text-left">
                    <h1 className="font-display font-black text-xl leading-none text-white tracking-tight">
                      {settings?.collegeName
                        ?.split(" ")
                        .map((w: string) => w[0])
                        .join("") || "SCJ"}
                    </h1>
                    <p className="text-[10px] text-superior-gold uppercase tracking-[0.25em] font-black mt-1">
                      Management
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white/40 hover:text-white hover:bg-white/10 rounded-xl"
                >
                  <X size={20} />
                </Button>
              </div>

              <ScrollArea className="flex-1 px-2 relative z-10">
                <nav className="pb-8 space-y-1">
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

              <div className="p-6 border-t border-white/5 bg-black/20 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                  <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">
                    System Online
                  </p>
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
              {isAdmin && (
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
