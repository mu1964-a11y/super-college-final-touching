import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '../types';
import { Bell, Check, Trash2, Clock, ShieldAlert, Zap, Heart } from 'lucide-react';
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
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <ShieldAlert size={16} />;
      case 'success': return <Heart size={16} />;
      case 'warning': return <Zap size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'success': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
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
      <PopoverContent className="w-[420px] p-0 rounded-[2rem] border-none shadow-2xl overflow-hidden mt-2" align="end">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display font-black text-superior-teal">Activity Stream</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Real-time Admin Monitoring</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg px-3"
            onClick={onClearAll}
          >
            <Trash2 size={14} className="mr-1" /> Clear All
          </Button>
        </div>

        <ScrollArea className="h-[450px]">
          {notifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Bell size={32} className="text-slate-300" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No Recent Activity</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all relative group",
                    n.isRead ? "bg-white border-slate-100/50 opacity-60" : "bg-white border-superior-teal/10 shadow-sm"
                  )}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      getColors(n.type)
                    )}>
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-black text-[13px] text-slate-800 truncate">{n.title}</h4>
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-superior-teal" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{n.message}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
                            <Clock size={10} />
                            {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                          </div>
                          <div className="text-[9px] font-black text-superior-teal uppercase tracking-widest">
                            By {n.actorName}
                          </div>
                        </div>
                        
                        {!n.isRead && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 rounded-md hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-all opacity-0 group-hover:opacity-100"
                            onClick={() => onMarkRead(n.id)}
                          >
                            <Check size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Master Logs • End-to-End Encrypted</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
