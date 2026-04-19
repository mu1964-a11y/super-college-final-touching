import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Wallet, 
  FileText, 
  ChevronDown, 
  ChevronRight,
  School,
  Menu,
  X,
  Plus,
  CreditCard,
  BarChart3,
  Bell,
  AlertTriangle,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebaseData } from './hooks/useFirebaseData';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import DashboardView from './components/DashboardView';
import AdmissionsView from './components/AdmissionsView';
import StudentsView from './components/StudentsView';
import StaffView from './components/StaffView';
import AccountsView from './components/AccountsView';
import ReportsView from './components/ReportsView';
import LeadsManagementView from './components/LeadsManagementView';
import SettingsView from './components/SettingsView';
import AcademicView from './components/AcademicView';
import { Settings as SettingsIcon, Shield } from 'lucide-react';
import AccessControlDialog from './components/AccessControl';
import NotificationPanel from './components/NotificationPanel';

type Page = 'dashboard' | 'admissions' | 'students-boys' | 'students-girls' | 'staff' | 'accounts' | 'reports' | 'leads' | 'settings' | 'academic';

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  
  const [selectedSession, setSelectedSession] = useState('2026-28');
  
  const data = useFirebaseData(user);

  // Sync selected session with settings
  React.useEffect(() => {
    if (data.settings?.academicSession) {
      setSelectedSession(data.settings.academicSession);
    }
  }, [data.settings?.academicSession]);

  // Filtered Data based on session
  const filteredData = useMemo(() => {
    const filterBySession = (list: any[]) => {
      // If record has no session, we show it (historical/default)
      // If it has a session, it must match the selected one
      return list.filter(item => !item.session || item.session === selectedSession);
    };

    return {
      ...data,
      leads: filterBySession(data.leads),
      admissions: filterBySession(data.admissions),
      students: filterBySession(data.students),
      incomes: filterBySession(data.incomes),
      expenses: filterBySession(data.expenses),
      academicRecords: filterBySession(data.academicRecords),
      // Action wrappers to inject session
      addLead: (lead: any) => data.addLead({ ...lead, session: selectedSession }),
      addAdmission: (admission: any) => data.addAdmission({ ...admission, session: selectedSession }),
      addStudent: (student: any) => data.addStudent({ ...student, session: selectedSession }),
      addExpense: (expense: any) => data.addExpense({ ...expense, session: selectedSession }),
      addIncome: (income: any) => data.addIncome({ ...income, session: selectedSession }),
    };
  }, [data, selectedSession]);

  // Dynamic Theme Injection
  const { settings } = data;
  const themeStyles = useMemo(() => {
    if (!settings) return '';
    return `
      :root {
        --primary-color: ${settings.themeColor || '#10b981'};
        --sidebar-bg: ${settings.sidebarColor || '#0c2d2d'};
        --sidebar-text: ${settings.sidebarTextColor || '#ffffff'};
        --header-bg: ${settings.headerColor || '#ffffff'};
        --header-text: ${settings.headerTextColor || '#0f172a'};
        --font-family: "${settings.fontFamily || 'Inter'}", sans-serif;
        --radius: ${
          settings.cardRadius === 'none' ? '0px' : 
          settings.cardRadius === 'sm' ? '4px' :
          settings.cardRadius === 'md' ? '8px' :
          settings.cardRadius === 'lg' ? '12px' :
          settings.cardRadius === '2xl' ? '16px' :
          settings.cardRadius === '3xl' ? '24px' : '24px'
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

  const SUPER_ADMIN_EMAIL = 'mughalazam1964@gmail.com';
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  
  const userPermission = useMemo(() => data.permissions.find(p => p.email === user?.email), [data.permissions, user?.email]);
  const isAdmin = useMemo(() => isSuperAdmin || userPermission?.isAdmin, [isSuperAdmin, userPermission?.isAdmin]);
  const hasAnyAccess = useMemo(() => isSuperAdmin || (userPermission && userPermission.sections.length > 0), [isSuperAdmin, userPermission]);
  
  // Filter out dashboard from allowed sections if not super admin
  const allowedSections = useMemo(() => {
    const modulesFromSettings = data.settings?.enabledModules || ['dashboard', 'admissions', 'students', 'academic', 'staff', 'accounts', 'reports', 'leads', 'settings'];
    
    const baseAllowed = isSuperAdmin 
      ? modulesFromSettings 
      : (userPermission?.sections || []).filter(s => modulesFromSettings.includes(s));
      
    return baseAllowed;
  }, [isSuperAdmin, userPermission?.sections, data.settings?.enabledModules]);

  // Auto-redirect unauthorized users away from Dashboard
  React.useEffect(() => {
    if (user && !authLoading && !isSuperAdmin) {
      // If user is on dashboard or an unauthorized page, move them to their first allowed section
      const isCurrentlyUnauthorized = activePage === 'dashboard' || !allowedSections.includes(activePage);
      
      if (isCurrentlyUnauthorized && allowedSections.length > 0) {
        // Redirect to the first available section in their specific role
        let firstSection = allowedSections[0] as Page;
        
        // Handle students sub-item mapping if "students" is the base section
        if (firstSection === 'students' as any) {
          firstSection = 'students-boys';
        } 
        
        setActivePage(firstSection);
      }
    }
  }, [user, authLoading, isSuperAdmin, activePage, allowedSections]);

  const defaultersCount = useMemo(() => data.students.filter(s => 
    s.feeHistory?.some(f => f.status === 'Unpaid' || f.status === 'Partial')
  ).length, [data.students]);

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

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handlePasswordVerify = () => {
    if (isSuperAdmin) {
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
    setExpandedMenu(prev => prev === menu ? null : menu);
  };

  const handleNavClick = (pageId: Page, filter: string | null = null, parentMenu: string | null = null) => {
    setActivePage(pageId);
    setActiveFilter(filter);
    
    // Auto-expand parent menu if it's a sub-page
    const autoParent = {
      'students-boys': 'students',
      'students-girls': 'students',
      'staff': 'staff',
      'accounts': 'accounts'
    }[pageId as string] || null;
    
    setExpandedMenu(parentMenu || autoParent);
  };

  const NavItem = ({ 
    id, 
    label, 
    icon: Icon, 
    subItems 
  }: { 
    id: string; 
    label: string; 
    icon: any; 
    subItems?: { id: Page; label: string; filter?: string }[] 
  }) => {
    const isExpanded = expandedMenu === id;
    const isActive = activePage === id || subItems?.some(s => s.id === activePage);

    return (
      <div className="mb-0.5">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => subItems ? toggleMenu(id) : handleNavClick(id as Page, null, null)}
          className={cn(
            "w-full flex items-center justify-between px-6 py-2.5 transition-all duration-200 group relative",
            isActive 
              ? "bg-white/10 text-white border-l-[2.5px] border-superior-gold" 
              : "text-white/60 hover:bg-white/8 hover:text-white"
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
            <Icon size={18} className={cn(isActive ? "text-white" : "text-white/40 group-hover:text-white")} />
            <span className="font-medium text-[13px]">{label}</span>
          </div>
          {subItems && (
            <div className={cn("transition-transform duration-200 relative z-10", isExpanded ? "rotate-180" : "")}>
              <ChevronDown size={14} className="opacity-40" />
            </div>
          )}
        </motion.button>
        
        {subItems && isExpanded && (
          <div className="bg-black/10 py-1">
            {subItems.map((sub, idx) => (
              <button
                key={`${sub.id}-${idx}`}
                onClick={() => handleNavClick(sub.id, sub.filter, id)}
                className={cn(
                  "w-full text-left pl-14 pr-6 py-2 text-[12px] transition-all duration-200",
                  activePage === sub.id && (activeFilter === sub.filter || (!activeFilter && !sub.filter))
                    ? "text-superior-gold font-medium" 
                    : "text-white/40 hover:text-white hover:bg-white/5"
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

  const NavSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mt-6 mb-2">
      <h3 className="px-6 text-[10px] font-medium text-white/30 uppercase tracking-[0.15em] mb-2">{title}</h3>
      {children}
    </div>
  );

  if (authLoading || data.loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-superior-teal gap-6">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center animate-bounce shadow-2xl">
          <School size={32} className="text-superior-teal" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-white font-display font-black text-xl uppercase tracking-widest">SCJ</h2>
          <p className="text-superior-gold text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Initializing SCJ Systems...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-superior-teal p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-superior-teal/5 flex items-center justify-center mx-auto">
            <School size={40} className="text-superior-teal" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black text-slate-800 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 font-medium">Please sign in to access the SCJ Management System.</p>
          </div>
          <Button 
            onClick={async () => {
              const provider = new GoogleAuthProvider();
              try {
                await signInWithPopup(auth, provider);
              } catch (error) {
                console.error("Login failed:", error);
              }
            }}
            className="w-full h-16 bg-superior-teal text-white hover:bg-superior-teal/90 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-superior-teal/20"
          >
            Sign in with Google
          </Button>
          <div className="pt-4 invisible h-0" />
        </div>
      </div>
    );
  }

  if (!hasAnyAccess) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-superior-teal p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl text-center space-y-8">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center mx-auto text-rose-500">
            <Shield size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black text-slate-800 tracking-tight">Access Restricted</h1>
            <p className="text-slate-500 font-medium leading-relaxed">Your account ({user.email}) has not been granted access to the system modules yet. Please contact the administrator.</p>
          </div>
          <Button 
            onClick={handleLogout}
            className="w-full h-16 bg-rose-500 text-white hover:bg-rose-600 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/20"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden relative">
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
                  <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-xl shadow-black/20 transform rotate-3">
                    <School size={24} className="text-superior-teal" />
                  </div>
                  <div className="overflow-hidden text-left">
                    <h1 className="font-display font-black text-xl leading-none text-white tracking-tight">SCJ</h1>
                    <p className="text-[10px] text-superior-gold uppercase tracking-[0.25em] font-black mt-1">Management</p>
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
                  {allowedSections.includes('dashboard') && (
                    <NavSection title="Main Console">
                      {isSuperAdmin && (
                        <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                      )}
                    </NavSection>
                  )}

                  {(allowedSections.includes('leads') || allowedSections.includes('admissions')) && (
                    <NavSection title="Enrollment">
                      {allowedSections.includes('leads') && <NavItem id="leads" label="Lead Pipeline" icon={BarChart3} />}
                      {allowedSections.includes('admissions') && <NavItem id="admissions" label="Admissions" icon={UserPlus} />}
                    </NavSection>
                  )}

                  {(allowedSections.includes('students') || allowedSections.includes('academic') || allowedSections.includes('staff')) && (
                    <NavSection title="Academic">
                      {allowedSections.includes('students') && (
                        <NavItem 
                          id="students" 
                          label="Students" 
                          icon={Users} 
                          subItems={[
                            { id: 'students-boys', label: 'Boys Section' },
                            { id: 'students-girls', label: 'Girls Section' },
                            { id: 'students-boys', label: 'Attendance' },
                          ]}
                        />
                      )}
                      {allowedSections.includes('academic') && <NavItem id="academic" label="Academic Records" icon={GraduationCap} />}
                      {allowedSections.includes('staff') && (
                        <NavItem 
                          id="staff" 
                          label="Faculty & Staff" 
                          icon={Briefcase} 
                          subItems={[
                            { id: 'staff', label: 'Academic Staff', filter: 'Academic' },
                            { id: 'staff', label: 'Administration', filter: 'Administration' },
                            { id: 'staff', label: 'Support Staff', filter: 'Support' },
                            { id: 'staff', label: 'Payroll Management', filter: 'Management' },
                          ]}
                        />
                      )}
                    </NavSection>
                  )}

                  {allowedSections.includes('accounts') && (
                    <NavSection title="Financials">
                      <NavItem 
                        id="accounts" 
                        label="Finance Hub" 
                        icon={Wallet} 
                        subItems={[
                          { id: 'accounts', label: 'Fee Collection', filter: 'income' },
                          { id: 'accounts', label: 'Income Ledger', filter: 'income' },
                          { id: 'accounts', label: 'Expense Tracker', filter: 'expenses' },
                          { id: 'accounts', label: 'Financial Summary', filter: 'summary' },
                        ]}
                      />
                    </NavSection>
                  )}

                  {(allowedSections.includes('reports') || allowedSections.includes('settings')) && (
                    <NavSection title="Administration">
                      {allowedSections.includes('reports') && <NavItem id="reports" label="Intelligence Reports" icon={FileText} />}
                      {allowedSections.includes('settings') && <NavItem id="settings" label="System Settings" icon={SettingsIcon} />}
                    </NavSection>
                  )}
                </nav>
              </ScrollArea>

              <div className="p-6 border-t border-white/5 bg-black/20 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                  <p className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">System Online</p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fcfdfd]">
        {/* Header - Unified Navigation */}
        <header className="h-16 bg-white flex items-center justify-between px-6 border-b border-slate-100 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSidebarOpen(true)}
              className="text-slate-500 hover:text-superior-teal hover:bg-slate-50 rounded-xl h-10 w-10 transition-all active:scale-90"
            >
              <Menu size={22} />
            </Button>
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-superior-gold shadow-[0_0_8px_rgba(201,168,76,0.5)]" />
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.25em]">
                {activePage.replace('-', ' ')}
              </h2>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-50/50 p-1 rounded-2xl border border-slate-50">
              <button 
                onClick={() => handleNavClick('dashboard')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'dashboard' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Dashboard"
              >
                <LayoutDashboard size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'dashboard' ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('leads')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'leads' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Leads"
              >
                <BarChart3 size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'leads' ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('admissions')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'admissions' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Admissions"
              >
                <UserPlus size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'admissions' ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('students-boys')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  (activePage === 'students-boys' || activePage === 'students-girls') ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Students"
              >
                <Users size={18} className={cn("transition-transform group-hover:scale-110", (activePage === 'students-boys' || activePage === 'students-girls') ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('staff')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'staff' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Staff"
              >
                <Briefcase size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'staff' ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('accounts')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'accounts' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Finance"
              >
                <Wallet size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'accounts' ? "text-superior-teal" : "")} />
              </button>
              <button 
                onClick={() => handleNavClick('reports')}
                className={cn(
                  "p-2 rounded-xl transition-all hover:bg-white hover:shadow-sm group",
                  activePage === 'reports' ? "bg-white text-superior-teal shadow-md shadow-superior-teal/5" : "text-slate-400"
                )}
                title="Reports"
              >
                <FileText size={18} className={cn("transition-transform group-hover:scale-110", activePage === 'reports' ? "text-superior-teal" : "")} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 transition-all focus-within:border-superior-teal/30 focus-within:bg-white w-64">
              <Search size={14} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Global Search..." 
                className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full placeholder:text-slate-300 text-slate-600"
              />
            </div>

            <div className="h-8 w-[1px] bg-slate-100 mx-2" />

            <div className="flex items-center gap-3">
              <NotificationPanel 
                notifications={data.notifications}
                onMarkRead={data.markNotificationRead}
                onClearAll={data.clearAllNotifications}
              />
              
              <div 
                onClick={() => isSuperAdmin && setIsAccessDialogOpen(true)}
                className={cn(
                  "flex items-center gap-3 ml-2 pl-3 py-1 pr-1 border border-slate-100 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-superior-gold/30 transition-all cursor-pointer group shadow-sm",
                  !isSuperAdmin && "cursor-default border-slate-100 grayscale opacity-60"
                )}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-slate-800 leading-none uppercase tracking-widest group-hover:text-superior-teal">
                    {isSuperAdmin ? 'Master Admin' : userPermission?.displayName || 'Sub Admin'}
                  </p>
                </div>
                <div 
                  className={cn(
                    "w-8 h-8 rounded-xl border-2 border-superior-gold flex items-center justify-center text-[10px] font-black text-superior-teal bg-superior-gold/10 shadow-sm"
                  )}
                >
                  {isSuperAdmin ? 'AD' : (userPermission?.displayName?.[0] || 'U')}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Alert Strip - Refined */}
        {defaultersCount > 0 && (
          <div className="bg-superior-teal text-white px-10 py-2.5 flex items-center justify-between gap-4 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-6 h-6 rounded-lg bg-superior-gold/20 flex items-center justify-center text-superior-gold">
                <AlertTriangle size={14} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest leading-none">
                Ledger Alert: <span className="text-superior-gold">{defaultersCount} Defaulters</span> detected
              </p>
            </div>
            <button 
              onClick={() => handleNavClick('accounts')}
              className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg border border-white/10 transition-all relative z-10"
            >
              Review Ledger →
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {!isPasswordVerified ? (
            <div className="flex-1 h-full flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="w-16 h-16 rounded-2xl bg-superior-gold/10 flex items-center justify-center mx-auto text-superior-gold shadow-inner">
                  <Shield size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-display font-black text-superior-teal tracking-tight">Security Check</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">Please enter your secondary access password to unlock your management modules.</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    type="password"
                    placeholder="Enter Access Password"
                    className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-superior-gold/30 transition-all text-center text-lg font-black tracking-[0.5em]"
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerify()}
                  />
                  <Button 
                    className="w-full h-14 bg-superior-gold text-superior-teal hover:bg-superior-gold/90 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-superior-gold/20 active:scale-95 transition-all"
                    onClick={handlePasswordVerify}
                  >
                    Unlock Identity
                  </Button>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center pt-2">System Restricted to Identified Personnel</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-full p-4 sm:p-6 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activePage}-${activeFilter}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  {activePage === 'dashboard' && (
                    <DashboardView 
                      data={filteredData} 
                      setActivePage={handleNavClick} 
                      selectedSession={selectedSession}
                      setSelectedSession={setSelectedSession}
                    />
                  )}
                  {activePage === 'leads' && (
                    <LeadsManagementView 
                      data={filteredData} 
                      onNavigate={(page, filter) => handleNavClick(page as Page, filter)} 
                    />
                  )}
                  {activePage === 'admissions' && <AdmissionsView data={filteredData} initialFilter={activeFilter} selectedSession={selectedSession} />}
                  {activePage === 'students-boys' && <StudentsView data={filteredData} gender="Male" />}
                  {activePage === 'students-girls' && <StudentsView data={filteredData} gender="Female" />}
                  {activePage === 'staff' && <StaffView data={filteredData} initialFilter={activeFilter} />}
                  {activePage === 'accounts' && <AccountsView data={filteredData} initialTab={activeFilter} />}
                  {activePage === 'reports' && <ReportsView data={filteredData} initialFilter={activeFilter} />}
                  {activePage === 'settings' && <SettingsView data={filteredData} />}
                  {activePage === 'academic' && <AcademicView data={filteredData} />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
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
