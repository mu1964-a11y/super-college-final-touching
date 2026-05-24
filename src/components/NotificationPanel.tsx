import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '../types';
import { 
  Bell, Check, Trash2, Clock, ShieldAlert, Zap, Heart, 
  UserPlus, ReceiptText, UserCog, Lock, RefreshCw, X, ArrowRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

interface RichNotificationMessage {
  summary: string;
  action: 'add' | 'update' | 'delete';
  module: string;
  targetName: string;
  changes?: { field: string; old: string; new: string }[];
  fullRecord?: any;
  deletedRecord?: any;
}

export default function NotificationPanel({
  notifications,
  onMarkRead,
  onClearAll
}: NotificationPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'All' | 'Deletions' | 'Admissions' | 'Payments' | 'Staff'>('All');
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

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

  const parseMessage = (msg: any): { isRich: boolean; text: string; data?: RichNotificationMessage } => {
    if (!msg) return { isRich: false, text: '' };
    
    // If msg is already an object, it's rich!
    if (typeof msg === 'object' && msg !== null) {
      const parsed = msg as RichNotificationMessage;
      return { isRich: true, text: parsed.summary || 'Details updated', data: parsed };
    }
    
    if (typeof msg === 'string') {
      let trimmed = msg.trim();
      
      // Handle potential double serialization/quoting from DB
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
          const unescaped = JSON.parse(trimmed);
          if (typeof unescaped === 'string') {
            trimmed = unescaped.trim();
          } else if (typeof unescaped === 'object' && unescaped !== null) {
            const parsed = unescaped as RichNotificationMessage;
            return { isRich: true, text: parsed.summary || 'Details updated', data: parsed };
          }
        } catch (e) {
          // ignore parsing error for outer quotes
        }
      }

      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed) as RichNotificationMessage;
          return { isRich: true, text: parsed.summary || 'Details updated', data: parsed };
        } catch (e) {
          // not valid json
        }
      }
      return { isRich: false, text: msg };
    }
    
    return { isRich: false, text: String(msg) };
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
    if (actorName.includes('@')) return actorName.charAt(0).toUpperCase();
    const parts = actorName.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return actorName.charAt(0).toUpperCase();
  };

  const activeRichDetail = selectedNotif ? parseMessage(selectedNotif.message) : null;

  return (
    <>
      <Popover>
        <PopoverTrigger className="relative flex items-center justify-center p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-superior-teal hover:bg-white transition-all group cursor-pointer">
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
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer",
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
                  const parsedMessage = parseMessage(n.message);
                  
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (!n.isRead) onMarkRead(n.id);
                        setSelectedNotif(n);
                      }}
                      className={cn(
                        "p-4 transition-all relative group flex gap-4 hover:bg-slate-50 cursor-pointer",
                        !n.isRead ? "bg-white" : "bg-white opacity-75"
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
                          {parsedMessage.text}
                          {theme.category === 'Deletions' && !parsedMessage.text.toLowerCase().includes('irreversible') && " — irreversible"}
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
            <div className="text-[10px] text-slate-400 font-semibold cursor-default">
              Click Any to View Details
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* DETAILED CHANGE LOG DIALOG MODAL */}
      {selectedNotif && activeRichDetail && activeRichDetail.isRich && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            id="notification-details-modal"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <span className={cn(
                  "px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border inline-block mb-1.5",
                  activeRichDetail.data?.action === 'add' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                  activeRichDetail.data?.action === 'update' && "bg-amber-50 text-amber-700 border-amber-100",
                  activeRichDetail.data?.action === 'delete' && "bg-rose-50 text-rose-700 border-rose-100",
                  !activeRichDetail.data?.action && "bg-slate-50 text-slate-700 border-slate-100"
                )}>
                  {activeRichDetail.data?.action?.toUpperCase() || "SYSTEM EVENT"}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedNotif.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged {format(new Date(selectedNotif.timestamp), 'PPpp')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                id="close-notification-modal-btn"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-5">
                {/* Section Overview */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Activity Overview</div>
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {activeRichDetail.text}
                  </p>
                  
                  {activeRichDetail.data?.targetName && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Linked Record Target:</span>
                      <span className="font-bold text-slate-900 px-2 py-1 bg-white border border-slate-100 rounded-lg">{activeRichDetail.data.targetName}</span>
                    </div>
                  )}
                  {activeRichDetail.data?.module && (
                    <div className="mt-1.5 flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">System Module:</span>
                      <span className="font-bold text-superior-teal">{activeRichDetail.data.module}</span>
                    </div>
                  )}
                </div>

                {/* Specific Changes list (UPDATED ACTION) */}
                {activeRichDetail.data?.action === 'update' && activeRichDetail.data.changes && (
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Field Changes Breakdown</div>
                    
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {activeRichDetail.data.changes.map((chg, idx) => (
                        <div key={idx} className="p-3.5 bg-white space-y-2 hover:bg-slate-50/50 transition-all">
                          <div className="text-xs font-bold text-slate-700">{chg.field}</div>
                          
                          <div className="grid grid-cols-11 gap-2 items-center text-xs">
                            {/* Before value */}
                            <div className="col-span-5 bg-rose-50/80 text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-100/50 truncate font-mono">
                              <span className="block text-[8px] font-bold text-rose-400 uppercase tracking-widest mb-0.5">Before</span>
                              {chg.old || 'None'}
                            </div>

                            {/* Arrow Indicator */}
                            <div className="col-span-1 flex justify-center text-slate-300">
                              <ArrowRight size={14} className="animate-pulse" />
                            </div>

                            {/* After value */}
                            <div className="col-span-5 bg-emerald-50/80 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-100/50 truncate font-mono">
                              <span className="block text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">After</span>
                              {chg.new || 'None'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Whole Added/Deleted record attributes (ADDED/DELETED ACTION) */}
                {(activeRichDetail.data?.action === 'add' || activeRichDetail.data?.action === 'delete') && (
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">
                      Record Attributes ({activeRichDetail.data.action === 'add' ? 'Added' : 'Deleted'})
                    </div>
                    
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 space-y-2.5 max-h-72 overflow-y-auto">
                      {Object.entries(activeRichDetail.data.fullRecord || activeRichDetail.data.deletedRecord || {})
                        .filter(([key, val]) => {
                          // Filter out internal and binary properties
                          return (
                            key !== 'id' &&
                            key !== 'photo' &&
                            key !== 'photo_url' &&
                            key !== 'feeHistory' &&
                            key !== 'feeLedger' &&
                            key !== 'performance' &&
                            key !== 'attendance' &&
                            !Array.isArray(val) &&
                            typeof val !== 'object' &&
                            val !== null &&
                            val !== undefined &&
                            String(val).trim() !== ''
                          );
                        })
                        .map(([key, val]) => {
                          const prettyKey = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase());
                          return (
                            <div key={key} className="flex justify-between items-start text-xs border-b border-dashed border-slate-200/60 pb-2 last:border-0 last:pb-0">
                              <span className="text-slate-400 font-medium">{prettyKey}:</span>
                              <span className="font-semibold text-slate-900 text-right max-w-[65%] truncate">
                                {String(val)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Audit Signoff */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 text-xs text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {getInitials(selectedNotif.actorName)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">{selectedNotif.actorName}</span> triggered this system update via device terminal.
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => setSelectedNotif(null)}
                className="bg-slate-900 text-white font-semibold text-xs px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                id="close-modal-bottom-btn"
              >
                Close Log details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PLAINTEXT system message backup modal */}
      {selectedNotif && activeRichDetail && !activeRichDetail.isRich && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            id="notification-plain-modal"
          >
            {/* Plain Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 rounded-md border border-slate-200 inline-block mb-1">
                  SYSTEM LOG
                </span>
                <h3 className="text-base font-bold text-slate-900">{selectedNotif.title}</h3>
                <p className="text-[11px] text-slate-400">
                  Logged {format(new Date(selectedNotif.timestamp), 'PPpp')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedNotif(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Plain Modal Content */}
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5 text-[13px] text-slate-700 leading-relaxed font-medium">
                {selectedNotif.message}
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px]">
                  {getInitials(selectedNotif.actorName)}
                </div>
                <div>
                  Actor: <span className="font-semibold text-slate-500">{selectedNotif.actorName}</span>
                </div>
              </div>
            </div>

            {/* Plain Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button 
                onClick={() => setSelectedNotif(null)}
                className="bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
