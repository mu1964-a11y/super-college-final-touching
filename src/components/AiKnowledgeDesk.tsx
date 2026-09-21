import React, { useState, useEffect } from 'react';
import {
  Brain,
  Sparkles,
  Plus,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  Clock,
  Send,
  MessageSquareQuote,
  ShieldCheck,
  Layers,
  ChevronRight,
  BookmarkCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords?: string[];
  is_active: boolean;
  priority?: number;
  created_at?: string;
}

interface UnansweredQuery {
  id: string;
  sender_phone: string;
  sender_name?: string;
  query: string;
  attempted_response?: string;
  status: 'pending' | 'approved' | 'dismissed';
  created_at: string;
}

const CATEGORIES = [
  'All',
  'Admissions',
  'Fee & Dues',
  'Scholarships',
  'Campus Rules',
  'Timings',
  'Hostels & Transport',
  'Exams & Tests',
  'General FAQs',
];

export default function AiKnowledgeDesk() {
  const [activeSubTab, setActiveSubTab] = useState<'knowledge' | 'unanswered'>('knowledge');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [unanswered, setUnanswered] = useState<UnansweredQuery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<KnowledgeItem> | null>(null);
  const [formCategory, setFormCategory] = useState('Admissions');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Answering an unanswered query
  const [activeResolvingId, setActiveResolvingId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState('');
  const [resolveCategory, setResolveCategory] = useState('Admissions');
  const [resolveAddToKb, setResolveAddToKb] = useState(true);
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Fetch Knowledge Base and Unanswered Queries
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [kbRes, unRes] = await Promise.all([
        fetch('/api/whatsapp/knowledge-base'),
        fetch('/api/whatsapp/unanswered-queries'),
      ]);

      if (kbRes.ok) {
        const kbData = await kbRes.json();
        setItems(kbData.items || []);
      }
      if (unRes.ok) {
        const unData = await unRes.json();
        setUnanswered(unData.queries || []);
      }
    } catch (err) {
      console.warn('Could not load AI Knowledge Desk data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save / Update a knowledge item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Title and Content are required.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/whatsapp/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem?.id,
          category: formCategory,
          title: formTitle.trim(),
          content: formContent.trim(),
          priority: formPriority,
          is_active: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(editingItem?.id ? 'Policy updated successfully!' : 'New Knowledge Rule added to AI!');
        setIsModalOpen(false);
        setEditingItem(null);
        setFormTitle('');
        setFormContent('');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save item.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving item.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete knowledge item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this knowledge rule? The AI will no longer know this.')) return;
    try {
      const res = await fetch(`/api/whatsapp/knowledge-base/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Knowledge rule deleted.');
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error('Could not delete rule.');
      }
    } catch {
      toast.error('Network error deleting rule.');
    }
  };

  // Resolve and teach bot from unanswered query
  const handleResolveQuery = async (queryItem: UnansweredQuery) => {
    if (!resolveAnswer.trim()) {
      toast.error('Please write an official answer before submitting.');
      return;
    }
    setIsSubmittingResolve(true);
    try {
      const res = await fetch('/api/whatsapp/unanswered-queries/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: queryItem.id,
          approvedAnswer: resolveAnswer.trim(),
          addToKnowledgeBase: resolveAddToKb,
          category: resolveCategory,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('AI successfully taught! This rule is now live.');
        setActiveResolvingId(null);
        setResolveAnswer('');
        fetchData();
      } else {
        toast.error(data.error || 'Could not resolve query.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error.');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  // Filtered knowledge items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingQueries = unanswered.filter((q) => q.status === 'pending');

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#064e43] via-[#085a4e] to-[#042822] text-white p-6 rounded-3xl shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-400/30">
                <Brain className="w-3.5 h-3.5" /> Self-Learning AI Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-bold border border-amber-400/30">
                <BookmarkCheck className="w-3.5 h-3.5" /> Zero Code Edits
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">AI Brain & Knowledge Desk</h2>
            <p className="text-emerald-100/80 text-xs sm:text-sm max-w-2xl font-medium">
              Teach Superior Nexus college policies, scholarship percentages, fee rules, and review questions parents asked so the AI gets smarter over time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormTitle('');
                setFormContent('');
                setFormCategory('Admissions');
                setFormPriority(1);
                setIsModalOpen(true);
              }}
              className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Plus size={15} /> Add Knowledge Rule
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchData}
              disabled={isLoading}
              className="rounded-xl border-white/20 bg-white/10 hover:bg-white/20 text-white"
              title="Refresh Knowledge Data"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
            activeSubTab === 'knowledge'
              ? 'bg-[#085a4e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen size={16} />
          <span>Campus Policies & FAQs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('unanswered')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition relative ${
            activeSubTab === 'unanswered'
              ? 'bg-[#085a4e] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <HelpCircle size={16} />
          <span>Unanswered Questions Queue</span>
          {pendingQueries.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse font-mono">
              {pendingQueries.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. TAB CONTENT 1: KNOWLEDGE RULES */}
      {activeSubTab === 'knowledge' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search policies or rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#085a4e]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#085a4e] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <BookOpen size={24} />
              </div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">No Knowledge Rules Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add official college rules, prospectus details, or scholarship policies to train your AI assistant.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-[#085a4e] hover:bg-[#064e43] text-white text-xs font-bold rounded-xl"
              >
                <Plus size={14} className="mr-1" /> Add First Rule
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px] font-black uppercase">
                        {item.category}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-400">P-{item.priority || 1}</span>
                    </div>

                    <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                      {item.title}
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 leading-relaxed font-sans">
                      {item.content}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Active in Bot Context
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setFormTitle(item.title);
                          setFormContent(item.content);
                          setFormCategory(item.category);
                          setFormPriority(item.priority || 1);
                          setIsModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        title="Delete Rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB CONTENT 2: UNANSWERED QUERIES REVIEW QUEUE */}
      {activeSubTab === 'unanswered' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-black text-sm block">How the Self-Learning Queue Works:</span>
              <p>
                When parents or students ask a question on WhatsApp that the AI does not know, it is automatically captured here. Type the official answer below and click <strong>"Approve & Teach AI"</strong>. The AI will permanently remember it!
              </p>
            </div>
          </div>

          {pendingQueries.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="font-black text-sm text-slate-800 dark:text-white">All WhatsApp Queries Resolved!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your AI assistant has official knowledge for all incoming queries. No pending questions in queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingQueries.map((q) => (
                <div
                  key={q.id}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                        {q.sender_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <span className="font-black text-xs text-slate-800 dark:text-white block">
                          {q.sender_name || 'Visitor / Parent'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{q.sender_phone}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} /> {new Date(q.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* The Query */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MessageSquareQuote size={12} className="text-emerald-600" /> User's WhatsApp Question:
                    </span>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      "{q.query}"
                    </p>
                  </div>

                  {/* Resolution Input Box */}
                  {activeResolvingId === q.id ? (
                    <div className="space-y-3 pt-2 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <label className="block text-[11px] font-black uppercase text-[#085a4e] dark:text-emerald-400">
                        Write Official Answer to Teach AI:
                      </label>
                      <textarea
                        rows={3}
                        value={resolveAnswer}
                        onChange={(e) => setResolveAnswer(e.target.value)}
                        placeholder="e.g. Yes, hostel facility is available for both Boys and Girls campuses. Monthly mess fee is Rs. 14,000 including food and laundry."
                        className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#085a4e]"
                      />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <select
                            value={resolveCategory}
                            onChange={(e) => setResolveCategory(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>

                          <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                            <input
                              type="checkbox"
                              checked={resolveAddToKb}
                              onChange={(e) => setResolveAddToKb(e.target.checked)}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Add permanently to Knowledge Base</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveResolvingId(null)}
                            className="text-slate-500 text-xs rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={isSubmittingResolve}
                            onClick={() => handleResolveQuery(q)}
                            className="bg-[#085a4e] hover:bg-[#064e43] text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Send size={13} />
                            <span>{isSubmittingResolve ? 'Teaching AI...' : 'Approve & Teach AI'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveResolvingId(q.id);
                          setResolveAnswer('');
                          setResolveCategory('Admissions');
                          setResolveAddToKb(true);
                        }}
                        className="bg-[#085a4e] hover:bg-[#064e43] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles size={13} />
                        <span>Answer & Teach AI</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. ADD / EDIT KNOWLEDGE RULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">
                    {editingItem?.id ? 'Edit College Knowledge Rule' : 'New College Knowledge Rule'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Superior Nexus Real-Time Instruction</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Topic Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Merit Scholarship for Matric 90%+ Marks"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Rule Content / Explanation *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="e.g. Students securing 90%+ in Matric are eligible for a 50% waiver on tuition fees. Free uniform and college bag are also included."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#085a4e] hover:bg-[#064e43] text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                >
                  {isSaving ? 'Saving...' : editingItem?.id ? 'Update Rule' : 'Save & Deploy to Bot'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
