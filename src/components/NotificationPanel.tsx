import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '../types';
import { Bell, Check, Trash2, Clock, ShieldAlert, Zap, Heart, UserPlus, ReceiptText, UserCog, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onClearAll
}: NotificationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Deletions' | 'Admissions' | 'Payments' | 'Staff'>('All');
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTheme = (n: Notification) => {
    const title = n.title.toLowerCase();
    const type = n.type;
    
    if (title.includes('delete') || title.includes('remove') || type === 'alert') {
      return {
        category: 'Deletions',
        severityText: 'Critical',
        icon: <Trash2 size={16} />,
        colorClass: 'rose', 
      };
    }
    if (title.includes('fee') || title.includes('payment') || title.includes('salary') || title.includes('income') || title.includes('advance')) {
      return {
        category: 'Payments',
        severityText: 'Payment',
        icon: <ReceiptText size={16} />,
        colorClass: 'amber',
      };
    }
    if (title.includes('admission') || title.includes('student') || title.includes('lead') || title.includes('enroll') || title.includes('promot')) {
      return {
        category: 'Admissions',
        severityText: 'Added',
        icon: <UserPlus size={16} />,
        colorClass: 'emerald',
      };
    }
    if (title.includes('staff') || title.includes('attendance') || title.includes('payroll') || title.includes('timetable')) {
      return {
        category: 'Staff',
        severityText: 'Edit',
        icon: <UserCog size={16} />,
        colorClass: 'blue',
      };
    }
    
    return { category: 'Other', severityText: 'Info', icon: <Bell size={16} />, colorClass: 'slate' };
  };

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'All') return notifications;
    return notifications.filter(n => {
      const theme = getTheme(n);
      return theme.category === activeFilter;
    });
  }, [notifications, activeFilter]);

  const stats = useMemo(() => {
    let deletions = 0;
    let admissions = 0;
    let payments = 0;

    notifications.forEach(n => {
      const cat = getTheme(n).category;
      if (cat === 'Deletions') deletions++;
      if (cat === 'Admissions') admissions++;
      if (cat === 'Payments') payments++;
    });

    return { deletions, admissions, payments };
  }, [notifications]);

  const getInitials = (actorName: string) => {
    if (!actorName) return 'A';
    // If it's an email, get first letter
    if (actorName.includes('@')) return actorName.charAt(0).toUpperCase();
    const parts = actorName.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return actorName.charAt(0).toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger className="relative flex items-center justify-center p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-superior-teal hover:bg-white transition-all group">
        <Bell size={24} className="group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-auto min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-50">
            {unreadCount > 999 ? '999+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0 rounded-xl border border-slate-200 shadow-2xl overflow-hidden mt-2" align="end">
        
        {/* Header */}
        <div className="bg-white p-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-bold text-slate-900">Activity stream</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Admin Monitoring</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 shadow-sm text-xs font-semibold text-slate-700 rounded-lg bg-white border-slate-200 hover:bg-slate-50"
            onClick={onClearAll}
          >
            <Trash2 size={14} className="mr-1.5" /> Clear all
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="px-5 py-3 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-white">
          {(['All', 'Deletions', 'Admissions', 'Payments', 'Staff'] as const).map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border",
                activeFilter === filter 
                  ? "bg-slate-50 text-slate-900 border-slate-200 shadow-sm" 
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              {filter === 'Deletions' ? (
                <span className="flex items-center gap-1.5"><RefreshCw size={12} className="rotate-45" /> Deletions</span>
              ) : filter}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        {activeFilter === 'All' && (
          <div className="px-5 py-4 border-b border-slate-100 bg-white grid grid-cols-3 gap-3">
            <div className="bg-[#FAF8F5] rounded-xl p-3 text-center border border-[#F5EFE6]">
              <div className="text-xl font-bold text-rose-600 mb-0.5">{stats.deletions}</div>
              <div className="text-[10px] font-semibold text-slate-500">Deletions</div>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3 text-center border border-[#F5EFE6]">
              <div className="text-xl font-bold text-emerald-600 mb-0.5">{stats.admissions}</div>
              <div className="text-[10px] font-semibold text-slate-500">Admissions</div>
            </div>
            <div className="bg-[#FAF8F5] rounded-xl p-3 text-center border border-[#F5EFE6]">
              <div className="text-xl font-bold text-amber-600 mb-0.5">{stats.payments}</div>
              <div className="text-[10px] font-semibold text-slate-500">Fee events</div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[400px] bg-white">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-70">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                <Bell size={32} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-600">No activity found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((n) => {
                const theme = getTheme(n);
                
                return (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      if (!n.isRead) onMarkRead(n.id);
                    }}
                    className={cn(
                      "p-4 transition-all relative group flex gap-4 hover:bg-slate-50 cursor-pointer",
                      !n.isRead ? "bg-white" : "bg-white opacity-70"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1",
                      theme.colorClass === 'rose' && "bg-rose-50 text-rose-500",
                      theme.colorClass === 'emerald' && "bg-emerald-50 text-emerald-500",
                      theme.colorClass === 'amber' && "bg-amber-50 text-amber-500",
                      theme.colorClass === 'blue' && "bg-blue-50 text-blue-500",
                      theme.colorClass === 'slate' && "bg-slate-50 text-slate-500"
                    )}>
                      {theme.icon}
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-[14px] text-slate-900">{n.title}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            theme.colorClass === 'rose' && "bg-rose-50 text-rose-600 border-rose-100",
                            theme.colorClass === 'emerald' && "bg-emerald-50 text-emerald-600 border-emerald-100",
                            theme.colorClass === 'amber' && "bg-amber-50 text-amber-600 border-amber-100",
                            theme.colorClass === 'blue' && "bg-blue-50 text-blue-600 border-blue-100",
                            theme.colorClass === 'slate' && "bg-slate-50 text-slate-600 border-slate-100"
                          )}>
                            {theme.severityText}
                          </span>
                        </div>
                        
                        {!n.isRead ? (
                           <div className={cn(
                             "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                             theme.colorClass === 'rose' && "bg-rose-500",
                             theme.colorClass === 'emerald' && "bg-emerald-500",
                             theme.colorClass === 'amber' && "bg-amber-500",
                             theme.colorClass === 'blue' && "bg-blue-500",
                             theme.colorClass === 'slate' && "bg-slate-500"
                           )} />
                        ) : null}
                      </div>

                      <p className="text-[13px] text-slate-600 mb-2.5">
                        {n.message}
                        {theme.category === 'Deletions' && !n.message.toLowerCase().includes('irreversible') && " — irreversible"}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-blue-100 text-blue-700">
                          {getInitials(n.actorName)}
                        </div>
                        <span className="truncate max-w-[180px]">{n.actorName}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock size={12} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">End-to-End Encrypted</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="h-8 bg-white border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
          >
            View full record
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
