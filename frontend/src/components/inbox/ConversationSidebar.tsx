'use client';

import { useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import { 
  ShoppingBag, ChevronDown, ChevronUp, User, Phone, Mail, Building, MapPin, 
  Tag, Plus, FileText, Sparkles, Activity, Folder, Trash2, Edit, Save, 
  Check, CheckCircle2, Lock, RefreshCw, X, Image as ImageIcon, File as FileIcon, Calendar
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import LabelForm from '@/components/labels/LabelForm';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const toLocalISOString = (dateStr?: string | Date | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCleanContactDisplayName = (contact?: { name?: string | null; phone?: string | null; externalContactId?: string | null } | null) => {
  if (!contact) return 'Customer';
  const name = contact.name?.trim();
  const phone = contact.phone?.trim();
  const extId = contact.externalContactId?.trim();

  if (name && name !== 'WhatsApp User' && name !== 'Messenger User' && name !== 'Instagram User' && !/^\d{15,}$/.test(name) && !name.startsWith('lid:')) {
    return name;
  }
  if (phone && !/^\d{15,}$/.test(phone)) {
    return phone.startsWith('+') ? phone : `+${phone}`;
  }
  if (extId && !/^\d{15,}$/.test(extId) && !extId.startsWith('lid:') && /^\d{8,14}$/.test(extId)) {
    return `+${extId}`;
  }
  return 'WhatsApp User';
};

const getCleanContactPhone = (contact?: { phone?: string | null; externalContactId?: string | null } | null) => {
  if (!contact) return '';
  const phone = contact.phone?.trim();
  const extId = contact.externalContactId?.trim();
  if (phone && !/^\d{15,}$/.test(phone)) {
    return phone.startsWith('+') ? phone : `+${phone}`;
  }
  if (extId && !/^\d{15,}$/.test(extId) && !extId.startsWith('lid:') && /^\d{8,14}$/.test(extId)) {
    return `+${extId}`;
  }
  return '';
};

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
  const [stages, setStages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    address: '',
    stageId: '',
    assignedUserId: '',
    followUpAt: '',
    automatedFollowUpMessage: '',
    enableAutomatedFollowUp: false,
  });

  useEffect(() => {
    const token = Cookies.get('access_token');
    if (!token) return;

    fetch(`${API}/leads/stages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => { if (res.ok) return res.json(); })
      .then(data => { if (Array.isArray(data)) setStages(data); })
      .catch(console.error);

    fetch(`${API}/tenant/team`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => { if (res.ok) return res.json(); })
      .then(data => { 
        if (data) setTeamMembers(Array.isArray(data) ? data : (data.users || [])); 
      })
      .catch(console.error);
  }, []);

  const [isPickingFollowUp, setIsPickingFollowUp] = useState(false);
  const [directFollowUp, setDirectFollowUp] = useState({
    date: '',
    enable: false,
    message: ''
  });

  useEffect(() => {
    if (contact) {
      setDirectFollowUp({
        date: toLocalISOString(contact.followUpAt),
        enable: !!contact.automatedFollowUpMessage,
        message: contact.automatedFollowUpMessage || ''
      });
    }
  }, [contact]);

  const initialDirectDate = toLocalISOString(contact?.followUpAt);
  const initialDirectEnable = !!contact?.automatedFollowUpMessage;
  const initialDirectMessage = contact?.automatedFollowUpMessage || '';

  const hasDirectChanges = 
    directFollowUp.date !== initialDirectDate ||
    directFollowUp.enable !== initialDirectEnable ||
    directFollowUp.message !== initialDirectMessage;

  const handleDirectFollowUpSave = async () => {
    if (!contact?.id) return;
    if (directFollowUp.enable && directFollowUp.message?.trim() && !directFollowUp.date) {
      toast.error(language === 'en' ? 'Please set a follow-up date to schedule automated message' : 'অটোমেটেড মেসেজ শিডিউল করতে অনুগ্রহ করে ফলো-আপ তারিখ সিলেক্ট করুন');
      return;
    }
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          followUpAt: directFollowUp.date ? new Date(directFollowUp.date).toISOString() : null,
          automatedFollowUpMessage: directFollowUp.enable ? directFollowUp.message : null
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateContact(contact.id, updated);
        setIsPickingFollowUp(false);
        setTimeout(() => fetchActivities(), 250);
        toast.success(language === 'en' ? 'Follow-up saved' : 'ফলো-আপ তথ্য সেভ হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to update follow-up date');
    }
  };

  const handleResetFollowUp = async () => {
    if (!contact?.id) return;
    try {
      const token = Cookies.get('access_token');
      if (contact.followUpAt || contact.automatedFollowUpMessage) {
        const res = await fetch(`${API}/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            followUpAt: null,
            automatedFollowUpMessage: null
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          onUpdateContact(contact.id, updated);
          setDirectFollowUp({
            date: '',
            enable: false,
            message: ''
          });
          setTimeout(() => fetchActivities(), 250);
          toast.success(language === 'en' ? 'Follow-up cleared & reset' : 'ফলো-আপ রিসেট ও ডিলিট করা হয়েছে');
          return;
        }
      }
    } catch (err) {
      toast.error('Failed to reset follow-up date');
      return;
    }

    setDirectFollowUp({
      date: '',
      enable: false,
      message: ''
    });
    toast.success(language === 'en' ? 'Follow-up cleared' : 'ফলো-আপ রিসেট করা হয়েছে');
  };

  const setQuickFollowUp = (daysAhead: number, hour: number = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    d.setHours(hour, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}T${hours}:${mins}`;
    setDirectFollowUp(prev => ({ ...prev, date: formatted }));
  };

  const handleDirectStageSave = async (newStageId: string) => {
    if (!contact?.id) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stageId: newStageId || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateContact(contact.id, updated);
        setTimeout(() => fetchActivities(), 250);
        toast.success(language === 'en' ? 'Lead stage updated' : 'লিড স্টেজ আপডেট হয়েছে');
      }
    } catch (err) {
      toast.error('Failed to update lead stage');
    }
  };

  useEffect(() => {
    if (contact) {
      const cleanPhone = getCleanContactPhone(contact);
      const isLidName = contact.name && (/^\d{15,}$/.test(contact.name) || contact.name === 'WhatsApp User' || contact.name.startsWith('lid:'));
      setContactForm({
        name: isLidName ? (cleanPhone || '') : (contact.name || ''),
        phone: cleanPhone,
        email: contact.email || '',
        company: contact.company || '',
        address: contact.address || '',
        stageId: contact.stageId || '',
        assignedUserId: contact.assignedUserId || '',
        followUpAt: toLocalISOString(contact.followUpAt),
        automatedFollowUpMessage: contact.automatedFollowUpMessage || '',
        enableAutomatedFollowUp: !!contact.automatedFollowUpMessage,
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
        body: JSON.stringify({
          ...contactForm,
          followUpAt: contactForm.followUpAt ? new Date(contactForm.followUpAt).toISOString() : null,
          automatedFollowUpMessage: contactForm.enableAutomatedFollowUp ? contactForm.automatedFollowUpMessage : null,
        }),
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

  const [isSyncingMetaProfile, setIsSyncingMetaProfile] = useState(false);

  const handleSyncMetaProfile = async () => {
    if (!contact?.id) return;
    setIsSyncingMetaProfile(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/inbox/contacts/${contact.id}/sync-meta-profile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdateContact(contact.id, updated);
        toast.success(language === 'en' ? `Profile synced: ${updated.name}` : `প্রোফাইল সিঙ্ক হয়েছে: ${updated.name}`);
      } else {
        toast.error(language === 'en' ? 'Failed to sync profile' : 'প্রোফাইল সিঙ্ক করা যায়নি');
      }
    } catch (err) {
      toast.error('Sync failed');
    } finally {
      setIsSyncingMetaProfile(false);
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
        setTimeout(() => fetchActivities(), 250);
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
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || (language === 'en' ? 'Failed to generate summary' : 'সামারি তৈরি করতে ব্যর্থ হয়েছে'));
      }
    } catch (err) {
      toast.error(language === 'en' ? 'Error generating summary' : 'সামারি তৈরিতে ত্রুটি ঘটেছে');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Activity feed state
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const fetchActivities = useCallback(() => {
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

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

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

  const attachedLabelIds = (conversation?.labels || []).map((l: any) => l.labelId);

  return (
    <div className="w-full md:w-80 bg-card border border-border/80 shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.2)] rounded-2xl h-full overflow-y-auto p-3 space-y-3 custom-scrollbar text-foreground shrink-0">
      
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
          <div className="pt-1">
            <Link 
              href={`/dashboard/orders?new=1&contactId=${contact?.id || ''}&conversationId=${conversation?.id || ''}`}
              className="flex items-center justify-center w-full px-2 py-1 bg-primary text-primary-foreground text-[11px] font-medium rounded-md hover:bg-primary/90 transition-colors shadow-xs"
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
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Name' : 'নাম'}</label>
                  <input 
                    type="text" 
                    value={contactForm.name} 
                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Phone' : 'ফোন'}</label>
                  <input 
                    type="text" 
                    value={contactForm.phone} 
                    onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Email' : 'ইমেইল'}</label>
                  <input 
                    type="email" 
                    value={contactForm.email} 
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Company' : 'কোম্পানি'}</label>
                  <input 
                    type="text" 
                    value={contactForm.company} 
                    onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Address' : 'ঠিকানা'}</label>
                  <input 
                    type="text" 
                    value={contactForm.address} 
                    onChange={e => setContactForm({ ...contactForm, address: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all" 
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Kanban Stage' : 'স্টেজ (Kanban Stage)'}</label>
                  <select
                    value={contactForm.stageId}
                    onChange={e => setContactForm({ ...contactForm, stageId: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-blue-500/40 dark:border-blue-400/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all"
                  >
                    <option value="">{language === 'en' ? 'Select Stage...' : 'স্টেজ সিলেক্ট করুন...'}</option>
                    {stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{language === 'en' ? 'Assigned Agent' : 'অ্যাসাইনকৃত এজেন্ট'}</label>
                  <select
                    value={contactForm.assignedUserId}
                    onChange={e => setContactForm({ ...contactForm, assignedUserId: e.target.value })}
                    className="w-full bg-background dark:bg-zinc-900/90 border-2 border-zinc-600/60 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary shadow-xs transition-all"
                  >
                    <option value="">{language === 'en' ? 'Unassigned' : 'অ্যাসাইন করা হয়নি'}</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-foreground font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" />
                      {language === 'en' ? 'Follow-up Date & Time' : 'ফলো-আপ তারিখ ও সময়'}
                    </label>
                    {contactForm.followUpAt && (
                      <button
                        type="button"
                        onClick={() => setContactForm(prev => ({ ...prev, followUpAt: '', enableAutomatedFollowUp: false, automatedFollowUpMessage: '' }))}
                        className="text-[9.5px] text-red-500 hover:text-red-400 flex items-center gap-0.5 transition-colors bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"
                        title={language === 'en' ? 'Clear follow-up date' : 'ফলো-আপ রিসেট বা মুছুন'}
                      >
                        <X className="w-2.5 h-2.5" />
                        {language === 'en' ? 'Clear' : 'মুছুন / রিসেট'}
                      </button>
                    )}
                  </div>
                  <div className="relative w-full rounded-xl border-2 border-purple-500/40 dark:border-purple-400/40 bg-background dark:bg-zinc-900/90 shadow-sm focus-within:border-purple-500 transition-all">
                    <input 
                      type="datetime-local" 
                      value={contactForm.followUpAt} 
                      onChange={e => setContactForm({ ...contactForm, followUpAt: e.target.value })}
                      className="w-full bg-transparent px-3 py-2 text-xs font-bold text-foreground focus:outline-none [color-scheme:dark] cursor-pointer" 
                    />
                  </div>
                  
                  <div className="mt-2 space-y-2 border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl p-2.5 shadow-xs transition-all">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <input
                        type="checkbox"
                        checked={contactForm.enableAutomatedFollowUp}
                        onChange={(e) => setContactForm({ ...contactForm, enableAutomatedFollowUp: e.target.checked })}
                        className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-foreground flex items-center gap-1.5">
                        {language === 'en' ? 'Send Automated Follow-up Message (AI)' : 'অটোমেটেড ফলো-আপ মেসেজ (AI) পাঠান'}
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          AUTO
                        </span>
                      </span>
                    </label>

                    {contactForm.enableAutomatedFollowUp && (
                      <div className="space-y-1">
                        <textarea
                          placeholder={language === 'en' ? 'Type automated message here...' : 'অটোমেটেড মেসেজ এখানে লিখুন...'}
                          value={contactForm.automatedFollowUpMessage}
                          onChange={(e) => setContactForm({ ...contactForm, automatedFollowUpMessage: e.target.value })}
                          rows={3}
                          className="w-full bg-background dark:bg-zinc-900/90 border-2 border-emerald-500/30 dark:border-emerald-500/30 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 text-foreground resize-none"
                        />
                        {!contactForm.followUpAt && (
                          <p className="text-[9px] text-amber-500 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <span>⚠️</span>
                            {language === 'en' ? 'Select follow-up date above to schedule message' : 'মেসেজটি শিডিউল করতে উপরে ফলো-আপ তারিখ দিন'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between gap-2 text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-foreground font-semibold truncate">{getCleanContactDisplayName(contact)}</span>
                  </div>
                  {['messenger', 'instagram'].includes(contact?.channel) && (
                    <button
                      type="button"
                      onClick={handleSyncMetaProfile}
                      disabled={isSyncingMetaProfile}
                      className="px-1.5 py-0.5 rounded text-[10px] text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                      title={language === 'en' ? 'Sync Facebook/Meta Profile' : 'মেটা প্রোফাইল সিঙ্ক করুন'}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingMetaProfile ? 'animate-spin' : ''}`} />
                      <span>{language === 'en' ? 'Sync' : 'সিঙ্ক'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground select-all font-medium">
                    {getCleanContactPhone(contact) || (language === 'en' ? 'No phone set' : 'ফোন নম্বর যুক্ত নেই')}
                  </span>
                </div>
                {contact?.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span className="text-foreground select-all">{contact.email}</span>
                  </div>
                )}
                {contact?.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-foreground">{contact.company}</span>
                  </div>
                )}
                {contact?.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-foreground">{contact.address}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-muted-foreground border-t border-border/50 pt-2 mt-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-bold text-[10px] uppercase tracking-wider text-foreground shrink-0">{language === 'en' ? 'Stage:' : 'স্টেজ:'}</span>
                  </div>
                  <div className="relative rounded-lg border-2 border-blue-500/40 dark:border-blue-400/40 bg-background dark:bg-zinc-900/90 shadow-xs focus-within:border-blue-500 transition-all">
                    <select
                      value={contact?.stageId || ''}
                      onChange={e => handleDirectStageSave(e.target.value)}
                      className="text-xs font-bold bg-transparent px-2.5 py-1 text-foreground focus:outline-none cursor-pointer shrink-0 max-w-[170px] truncate"
                      title={language === 'en' ? 'Select Lead Stage' : 'লিড স্টেজ নির্বাচন করুন'}
                    >
                      <option value="" className="bg-card text-foreground">{language === 'en' ? 'Unassigned' : 'কোন স্টেজ নেই'}</option>
                      {stages.map(s => (
                        <option key={s.id} value={s.id} className="bg-card text-foreground">{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col text-muted-foreground pt-2 border-t border-border/50 gap-2">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                      <span className="font-bold text-[10px] uppercase tracking-wider text-foreground shrink-0">{language === 'en' ? 'Follow-up:' : 'ফলো-আপ:'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(directFollowUp.date || contact?.followUpAt) && (
                        <button
                          type="button"
                          onClick={handleResetFollowUp}
                          className="px-1.5 py-0.5 rounded text-[9.5px] text-red-500 hover:text-red-400 bg-red-500/10 border border-red-500/20 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          title={language === 'en' ? 'Reset / Delete follow-up' : 'ফলো-আপ রিসেট বা ডিলিট করুন'}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{language === 'en' ? 'Clear' : 'মুছুন'}</span>
                        </button>
                      )}
                      {hasDirectChanges && (
                        <button
                          type="button"
                          onClick={handleDirectFollowUpSave}
                          className="bg-primary text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-xs hover:bg-primary/90 transition flex items-center gap-1 shrink-0 animate-pulse cursor-pointer"
                          title={language === 'en' ? 'Save Follow-up' : 'ফলো-আপ সেভ করুন'}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{language === 'en' ? 'Save' : 'সেভ'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Outlined Date-Time Picker Box */}
                  <div className="relative w-full rounded-xl border-2 border-purple-500/40 dark:border-purple-500/50 bg-background dark:bg-zinc-900/90 shadow-sm focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                    <input
                      type="datetime-local"
                      value={directFollowUp.date}
                      onChange={e => setDirectFollowUp(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-transparent px-3 py-2 text-xs font-bold text-foreground focus:outline-none cursor-pointer [color-scheme:dark] tracking-wide"
                      title={language === 'en' ? 'Tap to choose follow-up date and time' : 'ফলো-আপ তারিখ ও সময় নির্বাচন করতে ট্যাপ করুন'}
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(1, 10)}
                      className="text-[9.5px] px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25 font-medium transition cursor-pointer"
                    >
                      {language === 'en' ? '+1 Day (10 AM)' : '+১ দিন (সকাল ১০টা)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(3, 10)}
                      className="text-[9.5px] px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25 font-medium transition cursor-pointer"
                    >
                      {language === 'en' ? '+3 Days' : '+৩ দিন'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickFollowUp(7, 10)}
                      className="text-[9.5px] px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25 font-medium transition cursor-pointer"
                    >
                      {language === 'en' ? '+1 Week' : '+১ সপ্তাহ'}
                    </button>
                  </div>

                  {/* Automated Message Box - Always visible & highlighted with blinking live indicator */}
                  <div className="flex flex-col gap-1.5 pt-1.5 w-full bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-xl p-2.5 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-xs transition-all">
                    <div className="flex items-center justify-between w-full">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <input
                          type="checkbox"
                          checked={directFollowUp.enable}
                          onChange={(e) => setDirectFollowUp(prev => ({ ...prev, enable: e.target.checked }))}
                          className="rounded border-gray-300 text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-foreground tracking-tight flex items-center gap-1.5">
                          {language === 'en' ? 'Automated Message (AI)' : 'অটোমেটেড মেসেজ (AI)'}
                          <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                            AUTO
                          </span>
                        </span>
                      </label>
                    </div>

                    {directFollowUp.enable && (
                      <div className="space-y-1.5 pt-1">
                        <textarea
                          placeholder={language === 'en' ? 'Type automated follow-up message to send...' : 'অটোমেটেড মেসেজ লিখুন...'}
                          value={directFollowUp.message}
                          onChange={(e) => setDirectFollowUp(prev => ({ ...prev, message: e.target.value }))}
                          rows={2}
                          className="w-full bg-background dark:bg-zinc-900/90 border-2 border-emerald-500/30 dark:border-emerald-500/30 rounded-lg p-2 text-xs font-normal text-foreground focus:outline-none focus:border-emerald-500 resize-none transition-all shadow-inner"
                        />
                        {!directFollowUp.date && (
                          <p className="text-[9px] text-amber-500 dark:text-amber-400 flex items-center gap-1 font-medium">
                            <span>⚠️</span>
                            {language === 'en' ? 'Select follow-up date above to schedule message' : 'মেসেজটি শিডিউল করতে উপরে ফলো-আপ তারিখ দিন'}
                          </p>
                        )}
                      </div>
                    )}

                    {hasDirectChanges && (
                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDirectFollowUp({
                              date: initialDirectDate,
                              enable: initialDirectEnable,
                              message: initialDirectMessage
                            });
                          }}
                          className="px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:bg-muted transition cursor-pointer"
                        >
                          {language === 'en' ? 'Cancel' : 'বাতিল'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDirectFollowUpSave}
                          className="px-2.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded hover:bg-primary/90 transition flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          {language === 'en' ? 'Save' : 'সেভ করুন'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
                  onClick={async () => {
                    await onToggleLabel(lbl.id);
                    setTimeout(() => fetchActivities(), 250);
                  }}
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
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder={language === 'en' ? 'Add note for customer...' : 'কাস্টমার সম্পর্কে নোট লিখুন...'}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 bg-background dark:bg-zinc-900/90 border-2 border-amber-500/40 dark:border-amber-400/30 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none shadow-xs transition-all"
                />
                <button 
                  onClick={handleAddNote}
                  className="px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 shadow-xs flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title={language === 'en' ? 'Add Note' : 'নোট যোগ করুন'}
                >
                  <Plus className="w-4 h-4" />
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
                <div className="space-y-1.5">
                  <button 
                    onClick={() => handleGenerateSummary(false)}
                    disabled={generatingSummary}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-purple-600 text-white text-[11px] font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-xs"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                    {generatingSummary ? (language === 'en' ? 'Summarizing...' : 'সামারি তৈরি হচ্ছে...') : (language === 'en' ? 'Generate AI Summary' : 'AI সামারি তৈরি করুন')}
                  </button>
                  <p className="text-[9.5px] text-center text-muted-foreground font-sans flex items-center justify-center gap-1">
                    <span>⚡ {language === 'en' ? 'Uses 1 AI Response credit per generation' : 'প্রতিবার সামারি তৈরিতে ১টি AI রেসপন্স কোটা কেটে নেওয়া হবে'}</span>
                  </p>
                </div>
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
                    <span className="font-semibold text-foreground uppercase tracking-tight">
                      {act.type.replace('LABEL_ADDED', 'TAG_ADDED').replace('LABEL_REMOVED', 'TAG_REMOVED').replace(/_/g, ' ')}
                    </span>
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
                {files.map(f => {
                  const resolveFileUrl = (url: string | null) => {
                    if (!url) return '#';
                    if (url.startsWith('http://') || url.startsWith('https://')) return url;
                    const clean = url.startsWith('/') ? url : `/${url}`;
                    return `${API}${clean}`;
                  };
                  return (
                    <a
                      key={f.id}
                      href={resolveFileUrl(f.mediaUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="aspect-square bg-muted rounded-lg overflow-hidden border border-border flex flex-col items-center justify-center p-1 group hover:border-primary transition-colors"
                    >
                      {f.type === 'image' && f.mediaUrl ? (
                        <img src={resolveFileUrl(f.mediaUrl)} alt="shared" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      )}
                    </a>
                  );
                })}
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

      {/* Inline Create New Tag Modal with AI Prompt support */}
      {showNewTagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <LabelForm
              onSave={async (data) => {
                const created = await onCreateLabel(data);
                if (created && created.id) {
                  onToggleLabel(created.id);
                  setShowNewTagModal(false);
                  toast.success(language === 'en' ? 'Tag created & attached' : 'ট্যাগ তৈরি ও যুক্ত হয়েছে');
                }
              }}
              onCancel={() => setShowNewTagModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
