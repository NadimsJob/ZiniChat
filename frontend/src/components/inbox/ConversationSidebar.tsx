'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import { 
  ShoppingBag, ChevronDown, ChevronUp, User, Phone, Mail, Building, MapPin, 
  Tag, Plus, FileText, Sparkles, Activity, Folder, Trash2, Edit, Save, 
  Check, Lock, RefreshCw, X, Image as ImageIcon, File as FileIcon 
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ConversationSidebarProps {
  conversation: any;
  availableLabels: any[];
  onToggleLabel: (labelId: string) => void;
  onCreateLabel: (data: { name: string; color: string }) => Promise<any>;
  onUpdateContact: (contactId: string, data: any) => void;
}

export default function ConversationSidebar({
  conversation,
  availableLabels,
  onToggleLabel,
  onCreateLabel,
  onUpdateContact,
}: ConversationSidebarProps) {
  const { language } = useLanguage();

  // Feature flags
  const hasNotes = useFeature('inbox_notes');
  const hasSummary = useFeature('inbox_ai_summary');
  const hasActivity = useFeature('inbox_activity_timeline');
  const hasFiles = useFeature('inbox_shared_files');

  // Accordion collapsed states
  const [openSections, setOpenSections] = useState({
    orders: true,
    details: true,
    tags: true,
    notes: true,
    summary: true,
    activity: true,
    files: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Contact inline edit
  const contact = conversation?.contact;
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    phone: '',
    email: '',
    company: '',
    address: '',
  });

  useEffect(() => {
    if (contact) {
      setContactForm({
        phone: contact.phone || '',
        email: contact.email || '',
        company: contact.company || '',
        address: contact.address || '',
      });
    }
  }, [contact]);

  const handleSaveContact = async () => {
    if (!contact) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(contactForm),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateContact(contact.id, updated);
        setIsEditingContact(false);
        toast.success(language === 'en' ? 'Contact updated' : 'কনট্যাক্ট আপডেট হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to update contact');
    }
  };

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    if (!contact?.id || !hasNotes) return;
    const token = Cookies.get('access_token');
    setLoadingNotes(true);
    fetch(`${API}/contacts/${contact.id}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotes(data);
      })
      .catch(console.error)
      .finally(() => setLoadingNotes(false));
  }, [contact?.id, hasNotes]);

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !contact?.id) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNoteText }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes(prev => [created, ...prev]);
        setNewNoteText('');
        toast.success(language === 'en' ? 'Note added' : 'নোট যুক্ত হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!contact?.id) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${contact.id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
        toast.success(language === 'en' ? 'Note deleted' : 'নোট মোছা হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  // AI Summary state
  const [summary, setSummary] = useState<string | null>(conversation?.summary || null);
  const [summaryTime, setSummaryTime] = useState<string | null>(conversation?.summaryGeneratedAt || null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    setSummary(conversation?.summary || null);
    setSummaryTime(conversation?.summaryGeneratedAt || null);
  }, [conversation?.id, conversation?.summary, conversation?.summaryGeneratedAt]);

  const handleGenerateSummary = async (force: boolean = false) => {
    if (!conversation?.id) return;
    setGeneratingSummary(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/conversations/${conversation.id}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setSummaryTime(data.summaryGeneratedAt);
        toast.success(language === 'en' ? 'Summary ready' : 'সামারি তৈরি হয়েছে');
      } else {
        toast.error('Failed to generate summary');
      }
    } catch (err) {
      toast.error('Error generating summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Activity feed state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    if (!conversation?.id || !hasActivity) return;
    const token = Cookies.get('access_token');
    setLoadingActivities(true);
    fetch(`${API}/inbox/conversations/${conversation.id}/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.items)) setActivities(data.items);
      })
      .catch(console.error)
      .finally(() => setLoadingActivities(false));
  }, [conversation?.id, hasActivity]);

  // Shared Files state
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  useEffect(() => {
    if (!conversation?.id || !hasFiles) return;
    const token = Cookies.get('access_token');
    setLoadingFiles(true);
    fetch(`${API}/inbox/conversations/${conversation.id}/files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.items)) setFiles(data.items);
      })
      .catch(console.error)
      .finally(() => setLoadingFiles(false));
  }, [conversation?.id, hasFiles]);

  // Inline Tag Creation Modal State
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [creatingTag, setCreatingTag] = useState(false);

  const handleCreateNewTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const created = await onCreateLabel({ name: newTagName, color: newTagColor });
      if (created && created.id) {
        onToggleLabel(created.id);
        setShowNewTagModal(false);
        setNewTagName('');
        toast.success(language === 'en' ? 'Tag created & attached' : 'ট্যাগ তৈরি ও যুক্ত হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const attachedLabelIds = (conversation?.labels || []).map((l: any) => l.labelId);

  return (
    <div className="w-full md:w-80 bg-surface/90 backdrop-blur-xl border-l border-border h-full overflow-y-auto p-3 space-y-3 custom-scrollbar text-foreground">
      
      {/* 1. Order Actions */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('orders')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <ShoppingBag className="w-4 h-4 text-secondary" />
            {language === 'en' ? 'Order Actions' : 'অর্ডার অ্যাকশন'}
          </div>
          {openSections.orders ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>

        {openSections.orders && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link 
              href={`/dashboard/orders?contactId=${contact?.id || ''}`}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-[11px] font-medium rounded-lg transition-colors border border-border"
            >
              {language === 'en' ? 'Manage Orders' : 'অর্ডার ম্যানেজ'}
            </Link>
            <Link 
              href={`/dashboard/orders?new=1&contactId=${contact?.id || ''}&conversationId=${conversation?.id || ''}`}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
            >
              {language === 'en' ? 'Create Order' : 'অর্ডার তৈরি'}
            </Link>
          </div>
        )}
      </div>

      {/* 2. Contact Details */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('details')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <User className="w-4 h-4 text-primary" />
            {language === 'en' ? 'Contact Details' : 'কনট্যাক্ট তথ্য'}
          </div>
          <div className="flex items-center gap-2">
            {!isEditingContact ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsEditingContact(true); }}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                title="Edit Contact"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); handleSaveContact(); }}
                className="p-1 bg-primary text-white rounded"
                title="Save Contact"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            )}
            {openSections.details ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>

        {openSections.details && (
          <div className="space-y-2 pt-1 text-[11px]">
            {isEditingContact ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Phone</label>
                  <input 
                    type="text" 
                    value={contactForm.phone} 
                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Email</label>
                  <input 
                    type="email" 
                    value={contactForm.email} 
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Company</label>
                  <input 
                    type="text" 
                    value={contactForm.company} 
                    onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-primary" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-medium">Address</label>
                  <input 
                    type="text" 
                    value={contactForm.address} 
                    onChange={e => setContactForm({ ...contactForm, address: e.target.value })}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-primary" 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-foreground select-all">{contact?.phone || contact?.externalContactId || 'N/A'}</span>
                </div>
                {contact?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3 h-3 text-secondary shrink-0" />
                    <span className="text-foreground select-all">{contact.email}</span>
                  </div>
                )}
                {contact?.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="text-foreground">{contact.company}</span>
                  </div>
                )}
                {contact?.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="text-foreground">{contact.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Tags / Labels */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('tags')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <Tag className="w-4 h-4 text-emerald-600" />
            {language === 'en' ? 'Tags' : 'ট্যাগস'}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNewTagModal(true); }}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Plus className="w-3 h-3" /> {language === 'en' ? 'Add New' : 'নতুন'}
            </button>
            {openSections.tags ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </div>
        </div>

        {openSections.tags && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableLabels.map(lbl => {
              const isAttached = attachedLabelIds.includes(lbl.id);
              return (
                <button
                  key={lbl.id}
                  onClick={() => onToggleLabel(lbl.id)}
                  style={{ 
                    backgroundColor: isAttached ? `${lbl.color}20` : 'transparent',
                    borderColor: lbl.color,
                    color: isAttached ? lbl.color : 'inherit'
                  }}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${isAttached ? 'shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: lbl.color }}></span>
                  {lbl.name}
                  {isAttached && <Check className="w-3 h-3" />}
                </button>
              );
            })}
            {availableLabels.length === 0 && (
              <span className="text-[11px] text-muted-foreground italic">
                {language === 'en' ? 'No tags created yet' : 'কোন ট্যাগ নেই'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 4. Notes for the Customer */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('notes')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <FileText className="w-4 h-4 text-amber-600" />
            {language === 'en' ? 'Notes for Customer' : 'কাস্টমার নোটস'}
            {notes.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {notes.length}
              </span>
            )}
          </div>
          {!hasNotes ? (
            <span title="Feature Locked"><Lock className="w-3.5 h-3.5 text-muted-foreground" /></span>
          ) : openSections.notes ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        {openSections.notes && (
          !hasNotes ? (
            <div className="p-2 bg-muted/50 rounded-lg text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              {language === 'en' ? 'Upgrade plan to unlock Notes' : 'নোটস আনলক করতে প্ল্যান আপগ্রেড করুন'}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex gap-1.5">
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Add note...' : 'নোট লিখুন...'}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-primary"
                />
                <button 
                  onClick={handleAddNote}
                  className="px-2 py-1 bg-primary text-primary-foreground text-[11px] font-medium rounded-lg hover:bg-primary/90"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {notes.map(n => (
                  <div key={n.id} className="bg-muted/40 p-2 rounded-lg text-[11px] group relative border border-border/50">
                    <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                    <div className="flex justify-between items-center mt-1 text-[9px] text-muted-foreground">
                      <span>{n.user?.name || 'Agent'} · {new Date(n.createdAt).toLocaleDateString()}</span>
                      <button 
                        onClick={() => handleDeleteNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && !loadingNotes && (
                  <div className="text-[10px] text-muted-foreground italic text-center py-1">
                    {language === 'en' ? 'No notes added yet' : 'কোন নোট নেই'}
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* 5. AI Conversation Summary */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('summary')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <Sparkles className="w-4 h-4 text-purple-600" />
            {language === 'en' ? 'Conversation Summary' : 'কনভারসেশন সামারি'}
          </div>
          {!hasSummary ? (
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          ) : openSections.summary ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        {openSections.summary && (
          !hasSummary ? (
            <div className="p-2 bg-muted/50 rounded-lg text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              {language === 'en' ? 'Upgrade plan to unlock AI Summary' : 'AI সামারি আনলক করতে প্ল্যান আপগ্রেড করুন'}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {summary ? (
                <div className="bg-purple-500/5 border border-purple-500/20 p-2.5 rounded-lg text-[11px] space-y-1.5">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{summary}</p>
                  {summaryTime && (
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground pt-1 border-t border-purple-500/10">
                      <span>Generated: {new Date(summaryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button 
                        onClick={() => handleGenerateSummary(true)}
                        disabled={generatingSummary}
                        className="text-purple-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => handleGenerateSummary(false)}
                  disabled={generatingSummary}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 text-white text-[11px] font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                  {generatingSummary ? (language === 'en' ? 'Summarizing...' : 'সামারি তৈরি হচ্ছে...') : (language === 'en' ? 'Generate AI Summary' : 'AI সামারি তৈরি করুন')}
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* 6. Activity List */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('activity')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <Activity className="w-4 h-4 text-blue-600" />
            {language === 'en' ? 'Activity List' : 'অ্যাক্টিভিটি হিস্ট্রি'}
          </div>
          {!hasActivity ? (
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          ) : openSections.activity ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        {openSections.activity && (
          !hasActivity ? (
            <div className="p-2 bg-muted/50 rounded-lg text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              {language === 'en' ? 'Upgrade plan to unlock Activity Timeline' : 'টাইমলাইন আনলক করতে প্ল্যান আপগ্রেড করুন'}
            </div>
          ) : (
            <div className="space-y-2 pt-1 max-h-48 overflow-y-auto custom-scrollbar">
              {activities.map(act => (
                <div key={act.id} className="flex gap-2 text-[10px] items-start border-l-2 border-primary/40 pl-2 py-0.5">
                  <div className="flex-1">
                    <span className="font-semibold text-foreground uppercase tracking-tight">{act.type.replace('_', ' ')}</span>
                    <p className="text-muted-foreground text-[9.5px]">
                      {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && !loadingActivities && (
                <div className="text-[10px] text-muted-foreground italic text-center py-1">
                  {language === 'en' ? 'No recent activity recorded' : 'কোন সাম্প্রতিক অ্যাক্টিভিটি নেই'}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* 7. Shared Files */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-xs">
        <div 
          onClick={() => toggleSection('files')} 
          className="flex items-center justify-between cursor-pointer select-none mb-2"
        >
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <Folder className="w-4 h-4 text-indigo-600" />
            {language === 'en' ? 'Shared Files' : 'শেয়ারকৃত ফাইলসমূহ'}
          </div>
          {!hasFiles ? (
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          ) : openSections.files ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        {openSections.files && (
          !hasFiles ? (
            <div className="p-2 bg-muted/50 rounded-lg text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              {language === 'en' ? 'Upgrade plan to unlock Shared Files' : 'শেয়ারকৃত ফাইল আনলক করতে প্ল্যান আপগ্রেড করুন'}
            </div>
          ) : (
            <div className="pt-1">
              <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {files.map(f => (
                  <a
                    key={f.id}
                    href={f.mediaUrl ? `${API}${f.mediaUrl}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square bg-muted rounded-lg overflow-hidden border border-border flex flex-col items-center justify-center p-1 group hover:border-primary transition-colors"
                  >
                    {f.type === 'image' && f.mediaUrl ? (
                      <img src={`${API}${f.mediaUrl}`} alt="shared" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <FileIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    )}
                  </a>
                ))}
              </div>
              {files.length === 0 && !loadingFiles && (
                <div className="text-[10px] text-muted-foreground italic text-center py-1">
                  {language === 'en' ? 'No shared files' : 'কোন ফাইল শেয়ার করা হয়নি'}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Inline Create New Tag Modal */}
      {showNewTagModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-4 w-72 space-y-3 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h4 className="text-xs font-bold text-foreground">
                {language === 'en' ? 'Create New Tag' : 'নতুন ট্যাগ তৈরি করুন'}
              </h4>
              <button onClick={() => setShowNewTagModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Tag Name</label>
                <input 
                  type="text"
                  placeholder="e.g. VIP Client, High Priority"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-medium">Color</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color"
                    value={newTagColor}
                    onChange={e => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent p-0"
                  />
                  <span className="text-xs font-mono text-muted-foreground">{newTagColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button 
                onClick={() => setShowNewTagModal(false)}
                className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNewTag}
                disabled={creatingTag}
                className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90"
              >
                {creatingTag ? 'Creating...' : 'Save & Attach'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
