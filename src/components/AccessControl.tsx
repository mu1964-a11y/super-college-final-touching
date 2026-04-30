import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { UserPermission } from '../types';
import { Mail, Shield, User, Trash2, Key, Eye, EyeOff, Circle, Plus, Edit2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Lead Pipeline' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'students', label: 'Students' },
  { id: 'academic', label: 'Academic' },
  { id: 'staff', label: 'Staff' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

interface AccessControlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: UserPermission[];
  onUpdate: (permission: Omit<UserPermission, 'id'>) => void;
  onDelete: (email: string) => void;
}

export default function AccessControlDialog({
  open,
  onOpenChange,
  permissions,
  onUpdate,
  onDelete
}: AccessControlDialogProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleAdd = () => {
    if (!email) return;
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    
    onUpdate({
      email,
      displayName,
      sections: isAdmin ? SECTIONS.map(s => s.id) : selectedSections,
      isAdmin
    });
    // Reset
    setEmail('');
    setDisplayName('');
    setSelectedSections([]);
    setIsAdmin(false);
    setIsConfirming(false);
  };

  const toggleSection = (id: string) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleEdit = (p: UserPermission) => {
    setEmail(p.email || '');
    setDisplayName(p.displayName || '');
    setSelectedSections(p.sections || []);
    setIsAdmin(p.isAdmin || false);
    setIsConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1280px] w-[95vw] p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col lg:flex-row h-full max-h-screen lg:h-[85vh] lg:max-h-[850px] overflow-auto lg:overflow-hidden">
          {/* Left Side: Form */}
          <div className="w-full lg:w-[480px] p-6 lg:p-12 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col h-auto lg:h-full">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-3xl font-display font-black text-superior-teal flex items-center gap-3">
                <Shield className="text-superior-gold" size={32} />
                Access Control
              </DialogTitle>
              <p className="text-slate-500 font-medium text-xs">Provision system access for team members</p>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-6 -mr-6">
              <div className="space-y-5 pb-6">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Member Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <Input 
                      placeholder="e.g. staff@scj.edu.pk"
                      className="pl-12 h-12 rounded-2xl bg-white border-slate-100 shadow-sm font-bold focus:ring-superior-teal/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Identity (Name)</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <Input 
                      placeholder="e.g. Professor Ahmad"
                      className="pl-12 h-12 rounded-2xl bg-white border-slate-100 shadow-sm font-bold focus:ring-superior-teal/20"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1">Assign Modules & Deploy</Label>
                  
                  <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                      <div 
                        className={cn(
                          "min-h-11 w-full rounded-xl bg-white border border-slate-100 shadow-sm p-1.5 flex flex-wrap gap-1 cursor-pointer items-center pr-8 transition-all",
                          isDropdownOpen && "ring-2 ring-superior-teal/20 border-superior-teal/30",
                          isAdmin && "opacity-50 cursor-not-allowed bg-slate-50"
                        )}
                        onClick={() => !isAdmin && setIsDropdownOpen(!isDropdownOpen)}
                      >
                        {isAdmin ? (
                          <span className="text-[9px] font-black uppercase text-superior-gold px-2 py-0.5 bg-superior-gold/10 rounded-lg ml-1">Admin Unlock</span>
                        ) : selectedSections.length > 0 ? (
                          selectedSections.slice(0, 2).map(sid => {
                            const section = SECTIONS.find(s => s.id === sid);
                            return (
                              <span key={sid} className="text-[9px] font-black uppercase text-superior-teal px-1.5 py-0.5 bg-superior-teal/10 rounded flex items-center gap-1">
                                {section?.label}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 text-[10px] font-medium ml-2">Choose...</span>
                        )}
                        {selectedSections.length > 2 && <span className="text-[9px] font-black text-slate-400">+{selectedSections.length-2}</span>}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                          <Plus size={14} className={cn("transition-transform", isDropdownOpen && "rotate-45")} />
                        </div>
                      </div>

                      {isDropdownOpen && !isAdmin && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-1 overflow-hidden max-h-80 overflow-y-auto">
                          <div className="grid grid-cols-1 gap-0.5">
                            {SECTIONS.map(s => (
                              <div 
                                key={s.id} 
                                className={cn(
                                  "flex items-center space-x-2 p-2 rounded-lg transition-all cursor-pointer hover:bg-slate-50",
                                  selectedSections.includes(s.id) ? "bg-superior-teal/5 text-superior-teal" : "text-slate-600"
                                )}
                                onClick={() => toggleSection(s.id)}
                              >
                                <Checkbox 
                                  id={`section-${s.id}`} 
                                  checked={selectedSections.includes(s.id)}
                                  onCheckedChange={() => toggleSection(s.id)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 data-[state=checked]:bg-superior-teal shrink-0"
                                />
                                <Label htmlFor={`section-${s.id}`} className="text-[10px] font-black uppercase tracking-wider cursor-pointer flex-1">{s.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button 
                      className={cn(
                        "h-11 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-[0.98] shrink-0",
                        isConfirming ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-superior-teal hover:bg-superior-teal/90 text-white"
                      )}
                      onClick={handleAdd}
                    >
                      {isConfirming ? "Deploy" : "Save"}
                    </Button>
                    {isConfirming && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-11 w-11 rounded-xl text-slate-400"
                        onClick={() => setIsConfirming(false)}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer shadow-sm",
                  isAdmin ? "bg-superior-gold/10 border-superior-gold/30" : "bg-white border-slate-100"
                )}
                onClick={() => setIsAdmin(!isAdmin)}
                >
                  <Checkbox 
                    id="is-admin" 
                    checked={isAdmin}
                    onCheckedChange={(checked) => setIsAdmin(checked === true)}
                    className="h-4 w-4 rounded border-superior-gold/40 data-[state=checked]:bg-superior-gold"
                  />
                  <div>
                    <Label htmlFor="is-admin" className="text-[12px] font-black text-superior-teal uppercase tracking-widest cursor-pointer block">Super Admin</Label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Master System Key</p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t border-slate-200">
              {isConfirming && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl animate-in zoom-in-95">
                  <p className="text-[9px] font-black text-emerald-800 uppercase tracking-tighter">
                    Verify Email: <span className="underline">{email}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: List */}
          <div className="flex-1 bg-white p-6 lg:p-10 overflow-hidden flex flex-col h-[500px] lg:h-full">

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Active Privileges & Status</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                  <Circle size={6} fill="currentColor" /> Online
                </span>
                <span className="text-slate-200 text-xs">|</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Total: {permissions.length}
                </span>
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {permissions.map((p) => (
                  <div key={p.email} className="p-5 rounded-3xl border border-slate-100 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex group items-start gap-4 transition-all hover:border-superior-teal/20 relative">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-superior-teal/5 flex items-center justify-center text-superior-teal font-black text-sm shrink-0 border border-superior-teal/10">
                        {p.displayName ? p.displayName[0].toUpperCase() : p.email[0].toUpperCase()}
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                        p.status === 'online' ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-black text-slate-800 text-[14px] truncate">{p.displayName || 'System User'}</p>
                        {p.isAdmin && <Badge className="bg-superior-gold text-white border-none text-[8px] h-4">Super Admin</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[10px] text-slate-400 font-medium truncate">{p.email}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.isAdmin ? (
                          <span className="text-[8px] font-black uppercase border border-superior-gold/20 text-superior-gold px-1.5 py-0.5 rounded bg-superior-gold/5">Super Admin • All Modules Unlocked</span>
                        ) : (
                          p.sections.map(s => (
                            <span key={s} className="text-[8px] font-black uppercase border border-slate-100 text-slate-500 px-1.5 py-0.5 rounded bg-slate-50">{s}</span>
                          ))
                        )}
                        {p.sections.length === 0 && !p.isAdmin && (
                          <span className="text-[8px] font-black uppercase text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded">No Modules Assigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          p.status === 'online' ? "text-emerald-500" : "text-slate-400"
                        )}>
                          {p.status === 'online' ? 'Active Now' : 'Last Active'}
                        </span>
                        {p.lastActive && (
                          <span className="text-[9px] font-bold text-slate-400">
                             • {formatDistanceToNow(new Date(p.lastActive), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-superior-teal hover:text-white hover:bg-superior-teal rounded-xl h-9 w-9 border border-superior-teal/10 shadow-sm"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl h-9 w-9 border border-rose-100 shadow-sm"
                          onClick={() => onDelete(p.email)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full font-black uppercase tracking-widest", className)}>
      {children}
    </span>
  );
}
