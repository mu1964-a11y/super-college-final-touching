import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, User, CreditCard, Award, ArrowRight, CornerDownLeft, 
  Home, Users, Briefcase, Wallet, GraduationCap, CheckCircle2, 
  BarChart3, Settings as SettingsIcon, MessageSquare, X, Sparkles,
  Command, Layers, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  onSelectStudent: (student: any) => void;
  onNavigate: (page: string, filter?: string | null) => void;
}

export default function GlobalCommandPalette({
  isOpen,
  onClose,
  data,
  onSelectStudent,
  onNavigate,
}: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Navigation Shortcuts
  const moduleShortcuts = useMemo(() => [
    { id: 'dashboard', label: 'Main Dashboard', icon: Home, category: 'Navigation', hint: 'Overview & Stats' },
    { id: 'students-boys', label: 'Boys Campus Students', icon: Users, category: 'Students', hint: 'Active Roster' },
    { id: 'students-girls', label: 'Girls Campus Students', icon: Users, category: 'Students', hint: 'Active Roster' },
    { id: 'fee', label: 'Fees & Billing Center', icon: CreditCard, category: 'Finance', hint: 'Collect & Records' },
    { id: 'admissions', label: 'Admissions Desk', icon: Layers, category: 'Academic', hint: 'New Packages' },
    { id: 'leads', label: 'Leads Pipeline', icon: Sparkles, category: 'Marketing', hint: 'Inquiries Pool' },
    { id: 'staff', label: 'Staff & Payroll HR', icon: Briefcase, category: 'Administration', hint: 'Faculty Directory' },
    { id: 'accounts', label: 'Accounts & Expenses', icon: Wallet, category: 'Finance', hint: 'Cash Flow & Income' },
    { id: 'academic', label: 'Exam Results & Marks', icon: Award, category: 'Academic', hint: 'Preparatory Tests' },
    { id: 'attendance', label: 'Attendance Terminal', icon: CheckCircle2, category: 'Academic', hint: 'Daily Attendance' },
    { id: 'whatsapp-center', label: 'WhatsApp Center & 360° Bot', icon: MessageSquare, category: 'Communication', hint: 'Gateway & Broadcast' },
    { id: 'reports', label: 'Intelligence Reports', icon: BarChart3, category: 'Administration', hint: 'Audit & Analytics' },
    { id: 'settings', label: 'System Settings', icon: SettingsIcon, category: 'Administration', hint: 'College & Access' },
  ], []);

  // Filter students based on query (by name, rollNo, contact, fatherName)
  const matchingStudents = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const students = data?.students || [];

    return students.filter((s: any) => {
      const name = (s.fullName || '').toLowerCase();
      const father = (s.fatherName || '').toLowerCase();
      const roll = String(s.collegeNo || s.id || '').toLowerCase();
      const contact = String(s.contact || s.phone || '').replace(/\D/g, '');
      const cleanQ = q.replace(/\D/g, '');

      return name.includes(q) || 
             father.includes(q) || 
             roll.includes(q) || 
             (cleanQ && contact.includes(cleanQ));
    }).slice(0, 8); // Top 8 matches
  }, [query, data?.students]);

  // Filter module shortcuts
  const matchingModules = useMemo(() => {
    if (!query.trim()) return moduleShortcuts.slice(0, 6);
    const q = query.toLowerCase().trim();
    return moduleShortcuts.filter(m => 
      m.label.toLowerCase().includes(q) || 
      m.category.toLowerCase().includes(q) ||
      m.hint.toLowerCase().includes(q)
    );
  }, [query, moduleShortcuts]);

  // Combined flat list of items for keyboard navigation
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'student' | 'module'; data: any }> = [];
    matchingStudents.forEach(s => items.push({ type: 'student', data: s }));
    matchingModules.forEach(m => items.push({ type: 'module', data: m }));
    return items;
  }, [matchingStudents, matchingModules]);

  // Keyboard navigation handler (Arrows, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex];
      if (selected) {
        if (selected.type === 'student') {
          onSelectStudent(selected.data);
          onClose();
        } else if (selected.type === 'module') {
          onNavigate(selected.data.id);
          onClose();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[10vh] px-4 bg-black/60 backdrop-blur-md">
        {/* Backdrop click to close */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -15 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[75vh]"
        >
          {/* Top Search Input Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            <Search size={20} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search students by Name, Roll No (e.g. 1042), Phone, or Module..."
              className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 rounded border border-slate-300 dark:border-slate-700">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            
            {/* STUDENTS SECTION */}
            {matchingStudents.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <GraduationCap size={12} /> Student 360° Records ({matchingStudents.length})
                </div>
                {matchingStudents.map((student: any, idx: number) => {
                  const itemIndex = idx;
                  const isSelected = selectedIndex === itemIndex;
                  const remaining = Number(student.feeLedger?.remainingBalance ?? ((student.totalPackage || 0) - (student.feeReceived || 0)));

                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        onSelectStudent(student);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors text-xs",
                        isSelected 
                          ? "bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm",
                          isSelected ? "bg-teal-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                          {student.fullName ? student.fullName[0].toUpperCase() : <User size={16} />}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 dark:text-slate-100 truncate">
                              {student.fullName}
                            </span>
                            <Badge className="text-[9px] font-bold bg-superior-gold/20 text-slate-800 dark:text-superior-gold border-none py-0">
                              Roll: {student.collegeNo || student.id}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Father: {student.fatherName || 'N/A'} • {student.group || student.category || 'F.Sc'} {student.section ? `(Sec ${student.section})` : ''} • Phone: {student.contact || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {remaining > 0 ? (
                          <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 font-mono font-bold">
                            Dues: Rs. {remaining.toLocaleString()}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 font-bold">
                            Cleared
                          </Badge>
                        )}
                        <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hidden sm:inline flex items-center gap-1">
                          Open 360° <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* QUICK MODULE SHORTCUTS SECTION */}
            {matchingModules.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Command size={12} /> Fast Module Navigation
                </div>
                {matchingModules.map((module, idx) => {
                  const itemIndex = matchingStudents.length + idx;
                  const isSelected = selectedIndex === itemIndex;
                  const Icon = module.icon;

                  return (
                    <div
                      key={module.id}
                      onClick={() => {
                        onNavigate(module.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-xs",
                        isSelected 
                          ? "bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          isSelected ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {module.label}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2 font-normal">
                            • {module.hint}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-slate-400 border-slate-200 dark:border-slate-700">
                        {module.category}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {flatItems.length === 0 && (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <Search size={32} className="mx-auto opacity-30 text-slate-500" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching students or modules found</p>
                <p className="text-[11px] text-slate-400">
                  Try searching by Roll number (e.g. 1042), first name, or mobile number digits.
                </p>
              </div>
            )}

          </div>

          {/* Bottom Footer Help */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0 px-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[9px] font-mono">↵</kbd>
                Select
              </span>
            </div>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
              SCJ Spotlight Search
            </span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
