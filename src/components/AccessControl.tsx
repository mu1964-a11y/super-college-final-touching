import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPermission } from '../types';
import {
  Mail,
  Shield,
  User,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  CreditCard,
  Search,
  X,
  Check,
  CheckCircle2,
  Crown,
  Clock,
  Copy,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import ExecutiveIDCardModal from './ExecutiveIDCardModal';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Overview, analytics & KPIs' },
  { id: 'leads', label: 'Lead Pipeline', desc: 'Pre-admission inquiries & followups' },
  { id: 'admissions', label: 'Admissions', desc: 'Application processing & enrollment' },
  { id: 'fee', label: 'Fees & Billing', desc: 'Fee collections, challans & ledgers' },
  { id: 'accounts', label: 'Expenses & Income', desc: 'College financial accounts' },
  { id: 'students', label: 'Students', desc: 'Enrolled student profiles & dossiers' },
  { id: 'attendance', label: 'Attendance', desc: 'Gate face kiosk & class attendance' },
  { id: 'academic', label: 'Academic Records', desc: 'Marks entry, exams & grading' },
  { id: 'classes', label: 'Classes & Subjects', desc: 'Programs, sections & courses' },
  { id: 'timetable', label: 'Timetable', desc: 'Period scheduling & allocation' },
  { id: 'staff', label: 'Faculty & Staff', desc: 'Teachers directory & payroll' },
  { id: 'library', label: 'Library', desc: 'Book cataloging & circulation' },
  { id: 'reports', label: 'Intelligence Reports', desc: 'Executive BI exports & PDFs' },
  { id: 'settings', label: 'System Settings', desc: 'Campus config & master controls' },
];

interface AccessControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: UserPermission[];
  onUpdate: (permission: Omit<UserPermission, 'id'>) => void;
  onDelete: (email: string) => void;
  settings?: any;
}

export default function AccessControlDialog({
  open,
  onOpenChange,
  permissions,
  onUpdate,
  onDelete,
  settings
}: AccessControlDialogProps) {
  // Form State
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPermission | null>(null);

  // Search & Filters for Right List
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'super' | 'officers' | 'online'>('all');

  // Deletion Confirmation State
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);

  // Executive ID Card Modal
  const [selectedAdminCard, setSelectedAdminCard] = useState<UserPermission | null>(null);

  // Stats calculation
  const totalUsers = permissions.length;
  const superAdminCount = useMemo(() => permissions.filter(p => p.isAdmin).length, [permissions]);
  const officerCount = totalUsers - superAdminCount;
  const onlineCount = useMemo(() => permissions.filter(p => p.status === 'online').length, [permissions]);

  // Filtered members list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      // 1. Filter Tab
      if (activeFilter === 'super' && !p.isAdmin) return false;
      if (activeFilter === 'officers' && p.isAdmin) return false;
      if (activeFilter === 'online' && p.status !== 'online') return false;

      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = (p.displayName || '').toLowerCase().includes(q);
      const matchEmail = (p.email || '').toLowerCase().includes(q);
      const matchSection = (p.sections || []).some(s => s.toLowerCase().includes(q));
      return matchName || matchEmail || matchSection;
    });
  }, [permissions, activeFilter, searchQuery]);

  // Toggle single section
  const toggleSection = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Select / Deselect All Sections
  const selectAllSections = () => {
    setSelectedSections(SECTIONS.map(s => s.id));
  };
  const clearAllSections = () => {
    setSelectedSections([]);
  };

  // Edit User
  const handleStartEdit = (p: UserPermission) => {
    setEditingUser(p);
    setEmail(p.email || '');
    setDisplayName(p.displayName || '');
    setPassword('');
    setSelectedSections(p.sections || []);
    setIsAdmin(p.isAdmin || false);
    setIsDropdownOpen(false);
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingUser(null);
    setEmail('');
    setDisplayName('');
    setPassword('');
    setSelectedSections([]);
    setIsAdmin(false);
    setIsDropdownOpen(false);
  };

  // Save / Submit
  const handleSave = () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Baraye meherbani Member Email zaroor darj karein.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Ghalat email format hai. Valid email likhein.');
      return;
    }

    // If new user and password is empty
    if (!editingUser && !password.trim()) {
      toast.error('Naye user ke liye login password lazmi hai.');
      return;
    }

    onUpdate({
      email: cleanEmail,
      displayName: displayName.trim() || cleanEmail.split('@')[0],
      customPassword: password.trim() || undefined,
      sections: isAdmin ? SECTIONS.map(s => s.id) : selectedSections,
      isAdmin
    });

    handleCancelEdit();
  };

  // Delete Action
  const handleDeleteUser = (userEmail: string) => {
    onDelete(userEmail);
    setConfirmDeleteEmail(null);
    if (editingUser?.email === userEmail) {
      handleCancelEdit();
    }
  };

  // Copy Email to clipboard
  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`Copied: ${text}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1240px] w-[96vw] p-0 rounded-[2.5rem] overflow-hidden border border-slate-200/90 shadow-2xl bg-white max-h-[92vh] h-[88vh] flex flex-col">
          
          <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
            
            {/* LEFT SIDE: PROVISIONING FORM */}
            <div className="w-full lg:w-[460px] bg-slate-50/90 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col h-full min-h-0">
              
              {/* Form Header */}
              <div className="p-6 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#085a4e]/10 border border-[#085a4e]/20 flex items-center justify-center text-[#085a4e] shadow-xs">
                      <Shield className="w-5 h-5 text-[#c9a84c]" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Access Control</span>
                      </DialogTitle>
                      <p className="text-xs text-slate-500 font-medium">Provision system access for team</p>
                    </div>
                  </div>

                  {editingUser && (
                    <button
                      onClick={handleCancelEdit}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel Edit</span>
                    </button>
                  )}
                </div>

                {editingUser && (
                  <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between">
                    <span className="truncate">Editing: <b>{editingUser.displayName || editingUser.email}</b></span>
                    <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">Edit Mode</span>
                  </div>
                )}
              </div>

              {/* Form Scrollable Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100/60 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                
                {/* Member Email */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                    Member Email <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                      placeholder="e.g. staff@scj.edu.pk"
                      className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-2xs font-semibold text-sm focus:ring-[#085a4e]/20"
                      value={email}
                      disabled={!!editingUser}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Full Identity Name */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                    Full Identity (Name)
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                      placeholder="e.g. Professor Ahmad"
                      className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-2xs font-semibold text-sm focus:ring-[#085a4e]/20"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Login Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Login Password {!editingUser && <span className="text-rose-500">*</span>}
                    </Label>
                    {editingUser && (
                      <span className="text-[10px] text-slate-400 font-medium">Leave blank to keep current</span>
                    )}
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={editingUser ? "•••••••••••• (Unchanged)" : "Enter secure login password"}
                      className="pl-10 pr-10 h-11 rounded-xl bg-white border-slate-200 shadow-2xs font-semibold text-sm focus:ring-[#085a4e]/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Super Admin Master Toggle Card */}
                <div
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex items-center justify-between gap-3",
                    isAdmin
                      ? "bg-gradient-to-r from-amber-50 to-amber-100/60 border-amber-300 ring-2 ring-amber-300/40"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0",
                      isAdmin ? "bg-amber-500 text-white shadow-xs" : "bg-slate-100 text-slate-400"
                    )}>
                      <Crown size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900">Super Admin</span>
                        {isAdmin && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white">Full Access</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight">Master key with unrestricted system control</p>
                    </div>
                  </div>

                  <Checkbox
                    id="is-admin"
                    checked={isAdmin}
                    onCheckedChange={(checked) => setIsAdmin(checked === true)}
                    className="h-5 w-5 rounded-md border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white cursor-pointer"
                  />
                </div>

                {/* Assign Modules Dropdown & Tag List */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500 ml-1">
                      Assigned Modules {!isAdmin && `(${selectedSections.length}/${SECTIONS.length})`}
                    </Label>
                    {!isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={selectAllSections}
                          className="text-[10px] font-bold text-[#085a4e] hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300 text-xs">•</span>
                        <button
                          type="button"
                          onClick={clearAllSections}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-900">
                        <Sparkles size={14} className="text-amber-600" />
                        <span>All 14 Modules Automatically Unlocked</span>
                      </div>
                      <p className="text-[10px] text-amber-700 mt-0.5">Super Admins have universal privileges across all tabs.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Trigger Box */}
                      <div
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className={cn(
                          "min-h-12 w-full rounded-xl bg-white border border-slate-200 p-2 flex flex-wrap items-center gap-1.5 cursor-pointer pr-9 shadow-2xs transition-all",
                          isDropdownOpen && "ring-2 ring-[#085a4e]/20 border-[#085a4e]/40"
                        )}
                      >
                        {selectedSections.length > 0 ? (
                          selectedSections.map(sid => {
                            const sec = SECTIONS.find(s => s.id === sid);
                            return (
                              <span
                                key={sid}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#085a4e] bg-[#085a4e]/10 border border-[#085a4e]/20 px-2 py-0.5 rounded-lg"
                              >
                                <span>{sec?.label || sid}</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSection(sid);
                                  }}
                                  className="hover:text-rose-600 font-black cursor-pointer text-[11px] ml-0.5"
                                >
                                  ×
                                </span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 text-xs font-medium ml-1">
                            Modules choose karne ke liye click karein...
                          </span>
                        )}

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
                        </div>
                      </div>

                      {/* Dropdown Options Popup */}
                      {isDropdownOpen && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-1 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                          <div className="space-y-1">
                            {SECTIONS.map((s) => {
                              const isSelected = selectedSections.includes(s.id);
                              return (
                                <div
                                  key={s.id}
                                  onClick={() => toggleSection(s.id)}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all",
                                    isSelected
                                      ? "bg-[#085a4e]/10 text-[#085a4e] font-bold"
                                      : "hover:bg-slate-50 text-slate-700"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Checkbox
                                      id={`sec-${s.id}`}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleSection(s.id)}
                                      className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#085a4e]"
                                    />
                                    <div>
                                      <p className="text-xs font-bold leading-tight">{s.label}</p>
                                      <p className="text-[10px] text-slate-400 leading-tight">{s.desc}</p>
                                    </div>
                                  </div>
                                  {isSelected && <Check size={14} className="text-[#085a4e]" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Bottom Action Bar */}
              <div className="p-4 border-t border-slate-200 bg-white/95 shrink-0 flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 h-11 bg-[#085a4e] hover:bg-[#064239] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <CheckCircle2 size={16} />
                  <span>{editingUser ? "Update Privileges" : "Provision & Deploy Member"}</span>
                </Button>
                {editingUser && (
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="h-11 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: MEMBERS DIRECTORY & PRIVILEGES */}
            <div className="flex-1 bg-white flex flex-col h-full min-h-0">
              
              {/* Directory Top Header Row */}
              <div className="p-6 pb-4 border-b border-slate-100 shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#085a4e]" />
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Active Privileges & Directory</h2>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{onlineCount} Online</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-black">
                      Total: {totalUsers}
                    </span>
                  </div>
                </div>

                {/* Search Bar + Filter Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Search member by name, email, or module..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:bg-white focus:ring-2 focus:ring-[#085a4e]/20 focus:border-[#085a4e]/40 transition-all outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        activeFilter === 'all'
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      All ({totalUsers})
                    </button>
                    <button
                      onClick={() => setActiveFilter('super')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                        activeFilter === 'super'
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Crown size={12} />
                      <span>Admins ({superAdminCount})</span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('officers')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                        activeFilter === 'officers'
                          ? "bg-[#085a4e] text-white shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Officers ({officerCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Members Scrollable List (CRITICAL: flex-1 min-h-0 overflow-y-auto ensures PERFECT smooth scrolling with full visibility!) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3.5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
                {filteredPermissions.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl">
                    <ShieldAlert className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">Koi member match nahi hua</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      {searchQuery
                        ? `Search "${searchQuery}" ke mutabiq koi record nahi mila.`
                        : "Filter ke mutabiq koi member list mein nahi hai."}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                      >
                        Search Reset Karein
                      </button>
                    )}
                  </div>
                ) : (
                  filteredPermissions.map((p) => {
                    const isDeletingThis = confirmDeleteEmail === p.email;
                    const isSuper = p.isAdmin;

                    return (
                      <div
                        key={p.email}
                        className={cn(
                          "p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-white relative flex flex-col sm:flex-row items-start gap-4",
                          isSuper
                            ? "border-amber-200/90 shadow-[0_2px_12px_rgba(217,119,6,0.06)] hover:border-amber-300"
                            : "border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs",
                          editingUser?.email === p.email && "ring-2 ring-[#085a4e] border-transparent"
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-xs",
                            isSuper
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                              : "bg-gradient-to-br from-[#085a4e] to-[#04342d] text-white"
                          )}>
                            {(p.displayName ? p.displayName[0] : p.email[0]).toUpperCase()}
                          </div>
                          <span
                            title={p.status === 'online' ? "Online Active" : "Offline"}
                            className={cn(
                              "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                              p.status === 'online' ? "bg-emerald-500" : "bg-slate-300"
                            )}
                          />
                        </div>

                        {/* Middle Info Column */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Name & Role Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {p.displayName || 'System Member'}
                            </h4>
                            
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                <Crown size={11} />
                                <span>Super Admin</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#085a4e]/10 border border-[#085a4e]/20 text-[#085a4e] text-[10px] font-black uppercase tracking-wider">
                                <Shield size={10} />
                                <span>Officer</span>
                              </span>
                            )}

                            {editingUser?.email === p.email && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Active Edit
                              </span>
                            )}
                          </div>

                          {/* Email Row with 1-click Copy */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Mail size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{p.email}</span>
                            <button
                              onClick={() => copyToClipboard(p.email)}
                              title="Copy Email"
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                            >
                              <Copy size={12} />
                            </button>
                          </div>

                          {/* Modules Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {isSuper ? (
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md">
                                <Crown size={12} className="text-amber-600" />
                                <span>Master System Key • All 14 Modules Unlocked</span>
                              </span>
                            ) : p.sections && p.sections.length > 0 ? (
                              p.sections.map((secId) => {
                                const sec = SECTIONS.find(s => s.id === secId);
                                return (
                                  <span
                                    key={secId}
                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md"
                                  >
                                    {sec?.label || secId}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                No Modules Assigned (Restricted)
                              </span>
                            )}
                          </div>

                          {/* Activity & Last Login */}
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium pt-0.5">
                            <Clock size={12} />
                            <span>
                              {p.status === 'online' ? (
                                <strong className="text-emerald-600 font-bold">Active Online Now</strong>
                              ) : p.lastActive ? (
                                <>Last active {formatDistanceToNow(new Date(p.lastActive), { addSuffix: true })}</>
                              ) : (
                                "No recent session recorded"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Right Action Column */}
                        <div className="flex sm:flex-col items-center sm:items-end gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                          {isDeletingThis ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1.5 rounded-xl animate-in zoom-in-95">
                              <span className="text-[10px] font-bold text-rose-800 ml-1">Confirm?</span>
                              <Button
                                size="sm"
                                onClick={() => handleDeleteUser(p.email)}
                                className="h-7 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              >
                                Yes
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDeleteEmail(null)}
                                className="h-7 px-2 text-slate-500 text-[10px] rounded-lg"
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <div className="flex sm:flex-col gap-1.5">
                              {/* Executive Card Button */}
                              <button
                                onClick={() => setSelectedAdminCard(p)}
                                title="Official Executive ID Card"
                                className="h-8 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-700 hover:text-white border border-amber-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <CreditCard size={14} />
                                <span className="hidden sm:inline text-[10px]">ID Card</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleStartEdit(p)}
                                title="Edit User Privileges"
                                className="h-8 px-2.5 rounded-xl bg-slate-50 hover:bg-[#085a4e] text-slate-700 hover:text-white border border-slate-200 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit2 size={13} />
                                <span className="hidden sm:inline text-[10px]">Edit</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setConfirmDeleteEmail(p.email)}
                                title="Revoke & Delete Member Access"
                                className="h-8 px-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Executive ID Card Modal */}
      {selectedAdminCard && (
        <ExecutiveIDCardModal
          open={!!selectedAdminCard}
          onOpenChange={(open) => !open && setSelectedAdminCard(null)}
          settings={settings}
          entity={{
            type: 'admin',
            fullName: selectedAdminCard.displayName || 'College Administrator',
            idNumber: `ADM-${(selectedAdminCard.displayName || 'SCJ').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || '001'}`,
            categoryOrRole: selectedAdminCard.isAdmin ? 'Super Administrator' : 'Sub Administrator / Staff Officer',
            subCategory: selectedAdminCard.isAdmin 
              ? 'Institutional Executive Access' 
              : `Access: ${selectedAdminCard.sections?.slice(0, 2).join(', ') || 'Restricted'}`,
            sessionOrValidity: 'Official College Administration',
            email: selectedAdminCard.email,
            contact: 'College Administration Office',
            emergencyContact: '0300-0000000',
            address: 'Canal Road, Jahanian'
          }}
        />
      )}
    </>
  );
}
