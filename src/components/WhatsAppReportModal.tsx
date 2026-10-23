import React, { useState } from 'react';
import { X, Send, CheckCircle2, ExternalLink } from 'lucide-react';
import { formatWhatsAppPhone } from '../lib/whatsappAutomation';
import { toast } from 'sonner';

export interface ReportRecipientItem {
  id: string;
  student?: any;
  name: string;
  phone: string;
  rollNo?: string;
  className?: string;
  message: string;
  statusBadge?: string;
  isAbsent?: boolean;
}

interface WhatsAppReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  category?: string;
  items: ReportRecipientItem[];
  settings?: any;
}

export default function WhatsAppReportModal({
  open,
  onOpenChange,
  title,
  subtitle,
  items = [],
}: WhatsAppReportModalProps) {
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const handleSendSingle = async (item: ReportRecipientItem) => {
    const cleanPhone = formatWhatsAppPhone(item.phone);
    if (!cleanPhone) {
      toast.error(`Missing valid phone number for ${item.name}`);
      return;
    }
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, message: item.message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setSentIds((prev) => ({ ...prev, [item.id]: true }));
        toast.success(`Sent to ${item.name}`);
      } else {
        toast.error(data?.error || 'WhatsApp not connected');
      }
    } catch {
      toast.error('Network error while sending WhatsApp message');
    }
  };

  const handleBroadcastAll = async () => {
    const valid = items.filter((i) => formatWhatsAppPhone(i.phone).length >= 10);
    if (valid.length === 0) {
      toast.error('No valid phone numbers found in recipient list.');
      return;
    }
    setSending(true);
    let okCount = 0;
    for (const item of valid) {
      const cleanPhone = formatWhatsAppPhone(item.phone);
      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, message: item.message }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          okCount++;
          setSentIds((prev) => ({ ...prev, [item.id]: true }));
        }
      } catch {}
    }
    setSending(false);
    toast.success(`Broadcast finished: ${okCount} / ${valid.length} delivered.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-[#064e43] to-[#085a4e] text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black">{title}</h3>
            {subtitle && <p className="text-xs text-emerald-200 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto divide-y divide-slate-100 flex-1">
          {items.map((item) => {
            const clean = formatWhatsAppPhone(item.phone);
            const isSent = sentIds[item.id];
            return (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {item.rollNo ? `Roll: ${item.rollNo} • ` : ''}
                    {item.phone || 'No Phone'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSendSingle(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      isSent
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isSent ? <CheckCircle2 size={13} /> : <Send size={12} />}
                    <span>{isSent ? 'Sent' : 'Send'}</span>
                  </button>
                  {clean && (
                    <a
                      href={`https://wa.me/${clean}?text=${encodeURIComponent(item.message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Open in WhatsApp Web"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">{items.length} Recipients</span>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleBroadcastAll}
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              <span>{sending ? 'Sending...' : 'Broadcast All'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
