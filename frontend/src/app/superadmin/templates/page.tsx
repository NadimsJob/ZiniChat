'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import {
  MessageSquare, RefreshCw, Search, ShieldCheck, Library, Plus, Pencil, Trash2,
  X, Star, Eye, EyeOff, ArrowUpCircle, Smartphone, Check, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CATEGORY_TAGS = ['E-commerce', 'ঈদ অফার', 'Order Tracking', 'Appointment', 'Welcome', 'Support', 'Real Estate', 'Health', 'Education', 'Finance', 'Other'];
const CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const LANGUAGES = [{ value: 'bn', label: 'বাংলা (bn)' }, { value: 'en_US', label: 'English (en_US)' }];

// ── WhatsApp Phone Preview Component ───────────────────────────────────────────
function WhatsAppPreview({ bodyText, headerText, footerText }: { bodyText: string; headerText?: string; footerText?: string }) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  return (
    <div className="flex flex-col items-center justify-center bg-[#0a1929] rounded-2xl p-4 min-h-[300px]">
      <div className="w-[220px] bg-[#128c7e] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
        <div className="bg-[#128c7e] px-3 py-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-[11px] font-bold">Your Business</p>
            <p className="text-white/60 text-[9px]">WhatsApp Business</p>
          </div>
        </div>
        <div className="bg-[#ece5dd] p-3 min-h-[180px]">
          <div className="bg-white rounded-xl rounded-tl-none p-2.5 shadow-sm max-w-[90%]">
            {headerText && (
              <p className="text-[11px] font-bold text-gray-800 mb-1 border-b border-gray-100 pb-1">{headerText}</p>
            )}
            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap">
              {bodyText || 'Template preview will appear here...'}
            </p>
            {footerText && (
              <p className="text-[10px] text-gray-400 mt-1 pt-1 border-t border-gray-100">{footerText}</p>
            )}
            <p className="text-[9px] text-gray-400 text-right mt-1">{timeStr} ✓✓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Global Template Form Modal ─────────────────────────────────────────────────
function GlobalTemplateModal({
  mode, initial, onClose, onSave
}: {
  mode: 'create' | 'edit';
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const { language } = useLanguage();
  const [form, setForm] = useState({
    title: initial?.title || '',
    categoryTag: initial?.categoryTag || CATEGORY_TAGS[0],
    category: initial?.category || 'MARKETING',
    language: initial?.language || 'bn',
    headerFormat: initial?.headerFormat || 'NONE',
    headerText: initial?.headerText || '',
    bodyText: initial?.bodyText || '',
    footerText: initial?.footerText || '',
    isPublic: initial?.isPublic !== false,
    isFeatured: initial?.isFeatured || false,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.bodyText.trim()) {
      toast.error('Title and Body Text are required.');
      return;
    }
    setSaving(true);
    // Build components array from form
    const components: any[] = [];
    if (form.headerFormat !== 'NONE' && form.headerText) {
      components.push({ type: 'HEADER', format: form.headerFormat, text: form.headerText });
    }
    components.push({ type: 'BODY', text: form.bodyText });
    if (form.footerText.trim()) {
      components.push({ type: 'FOOTER', text: form.footerText.trim() });
    }
    try {
      await onSave({ ...form, components });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-hover rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-hover">
          <h2 className="font-bold text-[14px]">
            {mode === 'create'
              ? (language === 'en' ? 'Add to Global Library' : 'লাইব্রেরিতে যোগ করুন')
              : (language === 'en' ? 'Edit Template' : 'টেমপ্লেট সম্পাদনা')
            }
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left: Form */}
          <div className="p-5 space-y-3 border-r border-surface-hover">
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary"
                placeholder="e.g. Eid Special Promotion" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Category Tag</label>
                <select value={form.categoryTag} onChange={e => set('categoryTag', e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary">
                  {CATEGORY_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Language</label>
                <select value={form.language} onChange={e => set('language', e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary">
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Header Format</label>
                <select value={form.headerFormat} onChange={e => set('headerFormat', e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary">
                  {['NONE', 'TEXT'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            {form.headerFormat === 'TEXT' && (
              <div>
                <label className="text-[11px] text-zinc-400 mb-1 block">Header Text</label>
                <input value={form.headerText} onChange={e => set('headerText', e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary"
                  placeholder="Header text (supports {{1}})" />
              </div>
            )}
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Body Text * <span className="text-zinc-500">(use {`{{1}}`} for variables)</span></label>
              <textarea value={form.bodyText} onChange={e => set('bodyText', e.target.value)} rows={5}
                className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary resize-none"
                placeholder="হ্যালো {{1}}, আমাদের বিশেষ অফারে স্বাগতম..." />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Footer Text <span className="text-zinc-500">(optional)</span></label>
              <input value={form.footerText} onChange={e => set('footerText', e.target.value)}
                className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary"
                placeholder="e.g. ZiniChat · Reply STOP to unsubscribe" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-[12px] text-zinc-300">
                <input type="checkbox" checked={form.isPublic} onChange={e => set('isPublic', e.target.checked)} className="accent-primary w-3.5 h-3.5" />
                Public (visible to tenants)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[12px] text-amber-400">
                <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="accent-amber-400 w-3.5 h-3.5" />
                ⭐ Featured
              </label>
            </div>
          </div>
          {/* Right: Preview */}
          <div className="p-5">
            <p className="text-[11px] text-zinc-400 mb-3 text-center">Live Preview</p>
            <WhatsAppPreview bodyText={form.bodyText} headerText={form.headerFormat === 'TEXT' ? form.headerText : undefined} footerText={form.footerText} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-surface-hover flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-surface-hover text-zinc-300 text-[12px] font-bold rounded-xl hover:bg-surface-hover/80 transition-all">
            {language === 'en' ? 'Cancel' : 'বাতিল'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {mode === 'create' ? (language === 'en' ? 'Add to Library' : 'লাইব্রেরিতে যোগ করুন') : (language === 'en' ? 'Save Changes' : 'সংরক্ষণ করুন')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Promote Modal ──────────────────────────────────────────────────────────────
function PromoteModal({ template, onClose, onPromote }: { template: any; onClose: () => void; onPromote: (data: any) => Promise<void> }) {
  const [title, setTitle] = useState(template.name || '');
  const [categoryTag, setCategoryTag] = useState(CATEGORY_TAGS[0]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePromote = async () => {
    if (!title.trim()) { toast.error('Please enter a title.'); return; }
    setSaving(true);
    try { await onPromote({ title, categoryTag, isFeatured }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surface-hover rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-hover">
          <h2 className="font-bold text-[14px] flex items-center gap-2"><ArrowUpCircle className="w-4 h-4 text-primary" /> Promote to Global Library</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl text-[12px] text-primary">
            Tenant template: <strong>{template.name}</strong> · {template.category} · {template.status}
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Display Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary"
              placeholder="e.g. Eid Special Promotion" />
          </div>
          <div>
            <label className="text-[11px] text-zinc-400 mb-1 block">Category Tag</label>
            <select value={categoryTag} onChange={e => setCategoryTag(e.target.value)}
              className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary">
              {CATEGORY_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-[12px] text-amber-400">
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="accent-amber-400 w-3.5 h-3.5" />
            ⭐ Mark as Featured
          </label>
        </div>
        <div className="px-5 py-4 border-t border-surface-hover flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-surface-hover text-zinc-300 text-[12px] font-bold rounded-xl">Cancel</button>
          <button onClick={handlePromote} disabled={saving}
            className="px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
            Publish to Library
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SuperadminTemplatesPage() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'library'>('monitoring');

  // Monitoring state
  const [monTemplates, setMonTemplates] = useState<any[]>([]);
  const [monLoading, setMonLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Library state
  const [libTemplates, setLibTemplates] = useState<any[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [showPromote, setShowPromote] = useState<any>(null);
  const [suggestedTemplates, setSuggestedTemplates] = useState<any[]>([]);

  const token = Cookies.get('access_token');

  const fetchMonitoring = useCallback(async () => {
    setMonLoading(true);
    try {
      const res = await fetch(`${API}/broadcasts/admin/templates`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMonTemplates(await res.json());
    } catch { } finally { setMonLoading(false); }
  }, [token]);

  const fetchLibrary = useCallback(async () => {
    setLibLoading(true);
    try {
      const [libRes, monRes] = await Promise.all([
        fetch(`${API}/broadcasts/admin/library`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/broadcasts/admin/templates`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (libRes.ok) setLibTemplates(await libRes.json());
      if (monRes.ok) {
        const all: any[] = await monRes.json();
        setSuggestedTemplates(all.filter((t: any) => t.status === 'APPROVED'));
      }
    } catch { } finally { setLibLoading(false); }
  }, [token]);

  useEffect(() => { if (activeTab === 'monitoring') fetchMonitoring(); else fetchLibrary(); }, [activeTab]);

  const filteredMon = monTemplates.filter(t => {
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch = searchTerm === '' || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || (t.tenant?.businessName && t.tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleCreate = async (data: any) => {
    const res = await fetch(`${API}/broadcasts/admin/library`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { toast.error((await res.json()).message || 'Failed'); return; }
    toast.success('Template added to library!');
    setShowModal(null);
    fetchLibrary();
  };

  const handleEdit = async (data: any) => {
    const res = await fetch(`${API}/broadcasts/admin/library/${editTarget.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { toast.error((await res.json()).message || 'Failed'); return; }
    toast.success('Template updated!');
    setShowModal(null);
    setEditTarget(null);
    fetchLibrary();
  };

  const handleTogglePublic = async (tpl: any) => {
    const res = await fetch(`${API}/broadcasts/admin/library/${tpl.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: !tpl.isPublic }) });
    if (!res.ok) { toast.error('Failed to toggle visibility'); return; }
    toast.success(tpl.isPublic ? 'Hidden from library' : 'Now visible to tenants');
    fetchLibrary();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this global template?')) return;
    const res = await fetch(`${API}/broadcasts/admin/library/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { toast.error('Delete failed'); return; }
    toast.success('Deleted');
    fetchLibrary();
  };

  const handlePromote = async (tenantTemplateId: string, data: any) => {
    const res = await fetch(`${API}/broadcasts/admin/library/${tenantTemplateId}/promote`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { toast.error((await res.json()).message || 'Failed'); return; }
    toast.success('Published to Global Library!');
    setShowPromote(null);
    fetchLibrary();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-surface/70 backdrop-blur-xl border border-surface-hover p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-primary">
            <MessageSquare className="w-5 h-5" />
            {language === 'en' ? 'Template Management' : 'টেমপ্লেট ম্যানেজমেন্ট'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {language === 'en' ? 'Monitor Meta statuses & manage the Global Template Library' : 'মেটা স্ট্যাটাস মনিটর করুন এবং গ্লোবাল লাইব্রেরি ম্যানেজ করুন'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface/70 border border-surface-hover p-1 rounded-xl w-fit">
        {[
          { id: 'monitoring', icon: ShieldCheck, label: language === 'en' ? 'Meta Monitoring' : 'মেটা মনিটরিং' },
          { id: 'library', icon: Library, label: language === 'en' ? 'Global Library' : 'গ্লোবাল লাইব্রেরি' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Meta Monitoring ── */}
      {activeTab === 'monitoring' && (
        <>
          <div className="flex justify-end">
            <button onClick={fetchMonitoring} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-hover text-zinc-200 text-[12px] font-bold rounded-xl hover:bg-surface-hover/80 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />{language === 'en' ? 'Refresh Status' : 'রিফ্রেশ করুন'}
            </button>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 text-blue-400">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[12px]">
              <h3 className="font-bold text-[13px]">{language === 'en' ? 'Automated Meta Graph API Verification' : 'স্বয়ংক্রিয় মেটা গ্রাফ এপিআই ভেরিফিকেশন'}</h3>
              <p className="opacity-90">{language === 'en' ? 'Templates are reviewed and approved directly by Meta AI & Webhook status listeners. Superadmin manual approval is disabled as per WhatsApp Cloud API standards.' : 'হোয়াটসঅ্যাপ ক্লাউড এপিআই নিয়ম অনুযায়ী টেমপ্লেটসমূহ সরাসরি মেটা এআই ও ওয়েবহুকের মাধ্যমে অনুমোদিত হয়।'}</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-surface/70 border border-surface-hover p-3 rounded-2xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder={language === 'en' ? 'Search by tenant or template...' : 'টেন্যান্ট বা টেমপ্লেট নাম সার্চ...'}
                className="w-full bg-background border border-surface-hover rounded-xl pl-9 pr-3 py-1.5 text-[12px] outline-none focus:border-primary" />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
                <button key={st} onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${filterStatus === st ? 'bg-primary text-primary-foreground' : 'bg-surface-hover/30 text-zinc-400 hover:text-zinc-200'}`}>
                  {st}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4">
            {monLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : (
              <div className="space-y-3">
                {filteredMon.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-[13px]">{language === 'en' ? 'No templates found.' : 'কোনো টেমপ্লেট পাওয়া যায়নি।'}</div>
                ) : filteredMon.map(template => (
                  <div key={template.id} className="p-4 border border-surface-hover rounded-xl bg-background/40 hover:border-primary/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-[14px]">{template.name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${template.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : template.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{template.status}</span>
                          {template.status === 'APPROVED' && (
                            <button onClick={() => setShowPromote(template)} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full hover:bg-primary/20 transition-all border border-primary/20">
                              <ArrowUpCircle className="w-3 h-3" /> Promote to Library
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] text-zinc-400 mt-0.5">
                          Tenant: <strong className="text-zinc-200">{template.tenant?.businessName || 'Unknown'}</strong> &bull; {template.category} &bull; {template.language || 'bn'}
                        </p>
                      </div>
                      {template.metaTemplateId && <span className="text-[11px] font-mono text-zinc-500 bg-surface-hover px-2 py-0.5 rounded">ID: {template.metaTemplateId}</span>}
                    </div>
                    {template.bodyText && <div className="bg-background/80 p-3 rounded-lg border border-surface-hover text-[12px] whitespace-pre-wrap font-mono text-zinc-300 mb-2">{template.bodyText}</div>}
                    {template.rejectionReason && <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] rounded-lg"><strong>Meta Rejection Reason:</strong> {template.rejectionReason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB 2: Global Library ── */}
      {activeTab === 'library' && (
        <>
          <div className="flex justify-between items-center">
            <p className="text-[13px] text-zinc-400">{libTemplates.length} {language === 'en' ? 'templates in library' : 'টি টেমপ্লেট লাইব্রেরিতে আছে'}</p>
            <button onClick={() => { setEditTarget(null); setShowModal('create'); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-[12px] font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              <Plus className="w-3.5 h-3.5" />{language === 'en' ? 'Add Template' : 'টেমপ্লেট যোগ করুন'}
            </button>
          </div>

          {/* Suggested from Tenants */}
          {suggestedTemplates.length > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <h3 className="text-[13px] font-bold text-amber-400 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />{language === 'en' ? 'Suggested from Tenants (APPROVED)' : 'টেন্যান্টদের Approved টেমপ্লেট (Promote করুন)'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {suggestedTemplates.slice(0, 6).map((t: any) => (
                  <div key={t.id} className="bg-background/60 border border-amber-500/20 rounded-xl p-3 flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-zinc-200 truncate">{t.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{t.tenant?.businessName} · {t.category}</p>
                    </div>
                    <button onClick={() => setShowPromote(t)} className="shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] font-bold rounded-lg hover:bg-amber-500/20 transition-all border border-amber-500/20">
                      <ArrowUpCircle className="w-3 h-3" />Promote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Library Table */}
          <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl overflow-hidden">
            {libLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : libTemplates.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Library className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-[13px]">{language === 'en' ? 'Library is empty. Add templates to get started.' : 'লাইব্রেরি খালি। টেমপ্লেট যোগ করুন।'}</p>
              </div>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="border-b border-surface-hover bg-background/40">
                  <tr className="text-[11px] text-zinc-500">
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Tag / Category</th>
                    <th className="px-4 py-3 text-left">Language</th>
                    <th className="px-4 py-3 text-center">Used By</th>
                    <th className="px-4 py-3 text-center">Visibility</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover">
                  {libTemplates.map(tpl => (
                    <tr key={tpl.id} className="hover:bg-background/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tpl.isFeatured && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          <span className="font-bold text-zinc-200 truncate max-w-[180px]">{tpl.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate max-w-[200px] mt-0.5">{tpl.bodyText?.slice(0, 50)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-surface-hover px-2 py-0.5 rounded text-[11px] text-zinc-300 block w-fit mb-1">{tpl.categoryTag}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tpl.category === 'MARKETING' ? 'bg-purple-500/10 text-purple-400' : tpl.category === 'UTILITY' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>{tpl.category}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{tpl.language}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-primary text-[13px]">{tpl.usageCount}</span>
                        <p className="text-[10px] text-zinc-500">tenants</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleTogglePublic(tpl)} className={`p-1.5 rounded-lg transition-all ${tpl.isPublic ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-surface-hover text-zinc-500 hover:bg-surface-hover/80'}`}>
                          {tpl.isPublic ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditTarget(tpl); setShowModal('edit'); }} className="p-1.5 bg-surface-hover hover:bg-primary/10 hover:text-primary text-zinc-400 rounded-lg transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(tpl.id)} className="p-1.5 bg-surface-hover hover:bg-red-500/10 hover:text-red-400 text-zinc-400 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {showModal === 'create' && <GlobalTemplateModal mode="create" onClose={() => setShowModal(null)} onSave={handleCreate} />}
      {showModal === 'edit' && editTarget && <GlobalTemplateModal mode="edit" initial={editTarget} onClose={() => { setShowModal(null); setEditTarget(null); }} onSave={handleEdit} />}
      {showPromote && <PromoteModal template={showPromote} onClose={() => setShowPromote(null)} onPromote={(data) => handlePromote(showPromote.id, data)} />}
    </div>
  );
}
