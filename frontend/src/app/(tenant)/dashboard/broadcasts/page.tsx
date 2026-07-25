'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { Megaphone, Plus, Clock, Users, Play, AlertCircle, Info, X, Trash2, Smartphone, CheckCheck, Upload, FileText, Image as ImageIcon, Video, Link, Phone, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';

export default function BroadcastsPage() {
  const { language } = useLanguage();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  
  // Modals
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template Form State
  const [templateName, setTemplateName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [category, setCategory] = useState('MARKETING');
  const [templateLanguage, setTemplateLanguage] = useState('bn');
  const [headerFormat, setHeaderFormat] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerSamples, setHeaderSamples] = useState<{ [key: string]: string }>({});
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [headerFilePreview, setHeaderFilePreview] = useState<string | null>(null);

  const [bodyText, setBodyText] = useState('');
  const [bodySamples, setBodySamples] = useState<{ [key: string]: string }>({});
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<any[]>([]);

  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Extract variables from bodyText
  useEffect(() => {
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const uniqueVars = Array.from(new Set(matches));
    
    setBodySamples(prev => {
      const next: { [key: string]: string } = {};
      uniqueVars.forEach(v => {
        const num = v.replace(/[\{\}]/g, '');
        next[num] = prev[num] || '';
      });
      return next;
    });
  }, [bodyText]);

  // Extract variables from headerText if format is TEXT
  useEffect(() => {
    if (headerFormat === 'TEXT') {
      const matches = headerText.match(/\{\{(\d+)\}\}/g) || [];
      const uniqueVars = Array.from(new Set(matches));
      setHeaderSamples(prev => {
        const next: { [key: string]: string } = {};
        uniqueVars.forEach(v => {
          const num = v.replace(/[\{\}]/g, '');
          next[num] = prev[num] || '';
        });
        return next;
      });
    }
  }, [headerText, headerFormat]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const endpoint = activeTab === 'campaigns' ? 'broadcasts' : 'broadcasts/templates';
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError(language === 'en' ? 'Your plan does not support Broadcast Campaigns. Please upgrade your plan.' : 'আপনার প্ল্যানে ব্রডকাস্ট ক্যাম্পেইন সমর্থিত নয়। দয়া করে আপডেট করুন।');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      if (activeTab === 'campaigns') {
        setBroadcasts(data);
      } else {
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
      setError(language === 'en' ? 'An error occurred while fetching data.' : 'তথ্য লোড করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateNameChange = (val: string) => {
    setTemplateName(val);
    if (val && !/^[a-z0-9_]+$/.test(val)) {
      setNameError(language === 'en' ? 'Only lowercase letters, numbers, and underscores allowed' : 'শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা এবং আন্ডারস্কোর (_) ব্যবহার করা যাবে');
    } else {
      setNameError(null);
    }
  };

  const handleAddVariable = () => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Count existing variables to get next variable number
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const nextNum = matches.length + 1;
    const varTag = `{{${nextNum}}}`;

    const newText = bodyText.substring(0, start) + varTag + bodyText.substring(end);
    setBodyText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varTag.length, start + varTag.length);
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeaderFile(file);
      setHeaderFilePreview(URL.createObjectURL(file));
    }
  };

  const handleAddButton = () => {
    if (buttons.length >= 10) {
      toast.error(language === 'en' ? 'Maximum 10 buttons allowed' : 'সর্বোচ্চ ১০টি বাটন যুক্ত করা যাবে');
      return;
    }
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '', url: '', phoneNumber: '', sample: '' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: string, value: string) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const handleSubmitTemplate = async () => {
    if (!templateName || nameError) {
      toast.error(language === 'en' ? 'Please enter a valid template name' : 'সঠিক টেমপ্লেট নাম লিখুন');
      return;
    }
    if (!bodyText) {
      toast.error(language === 'en' ? 'Body text is required' : 'মেসেজ বডি দেওয়া বাধ্যতামূলক');
      return;
    }

    // Check if samples are provided for all variables
    const bodyVarKeys = Object.keys(bodySamples);
    for (const key of bodyVarKeys) {
      if (!bodySamples[key]?.trim()) {
        toast.error(language === 'en' ? `Please provide a sample value for {{${key}}}` : `{{${key}}}-এর জন্য স্যাম্পল ভ্যালু দিন`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const token = Cookies.get('access_token');
      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('category', category);
      formData.append('language', templateLanguage);
      formData.append('headerFormat', headerFormat);
      if (headerText) formData.append('headerText', headerText);
      if (Object.keys(headerSamples).length > 0) {
        formData.append('headerSamples', JSON.stringify(Object.values(headerSamples)));
      }
      formData.append('bodyText', bodyText);
      if (bodyVarKeys.length > 0) {
        formData.append('bodySamples', JSON.stringify(Object.values(bodySamples)));
      }
      if (footerText) formData.append('footerText', footerText);
      if (buttons.length > 0) {
        formData.append('buttons', JSON.stringify(buttons));
      }
      if (headerFile) {
        formData.append('file', headerFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/broadcasts/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit template');
      }

      toast.success(language === 'en' ? 'Template submitted to Meta successfully!' : 'মেটাতে টেমপ্লেট সফলভাবে সাবমিট করা হয়েছে!');
      setIsTemplateModalOpen(false);
      resetTemplateForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this template?' : 'আপনি কি নিশ্চিত যে এই টেমপ্লেটটি মুছে ফেলতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/broadcasts/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success(language === 'en' ? 'Template deleted' : 'টেমপ্লেট মুছে ফেলা হয়েছে');
        fetchData();
      } else {
        toast.error('Failed to delete template');
      }
    } catch (err) {
      toast.error('Error deleting template');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || !selectedTemplateId) {
      toast.error(language === 'en' ? 'Please fill in all campaign fields' : 'সবগুলো ফিল্ড পূরণ করুন');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/broadcasts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          scheduledAt: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create campaign');
      }

      toast.success(language === 'en' ? 'Campaign scheduled successfully!' : 'ক্যাম্পেইন শিডিউল করা হয়েছে!');
      setIsCampaignModalOpen(false);
      setCampaignName('');
      setSelectedTemplateId('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error creating campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setNameError(null);
    setCategory('MARKETING');
    setTemplateLanguage('bn');
    setHeaderFormat('NONE');
    setHeaderText('');
    setHeaderSamples({});
    setHeaderFile(null);
    setHeaderFilePreview(null);
    setBodyText('');
    setBodySamples({});
    setFooterText('');
    setButtons([]);
  };

  // Render Preview Text (replacing {{1}} with samples)
  const getRenderedBodyPreview = () => {
    let text = bodyText || (language === 'en' ? 'Your message preview will appear here...' : 'আপনার মেসেজের প্রিভিউ এখানে দেখাবে...');
    Object.keys(bodySamples).forEach(key => {
      const val = bodySamples[key] ? `[${bodySamples[key]}]` : `{{${key}}}`;
      text = text.replaceAll(`{{${key}}}`, val);
    });
    return text;
  };

  const getRenderedHeaderText = () => {
    let text = headerText;
    Object.keys(headerSamples).forEach(key => {
      const val = headerSamples[key] ? `[${headerSamples[key]}]` : `{{${key}}}`;
      text = text.replaceAll(`{{${key}}}`, val);
    });
    return text;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{error}</h2>
          <p className="text-zinc-400 mt-2">Access to this feature is restricted by your subscription plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex justify-between items-center bg-surface/70 backdrop-blur-xl border border-surface-hover p-4 rounded-2xl">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2 text-primary">
            <Megaphone className="w-5 h-5" /> 
            {language === 'en' ? 'Broadcast Campaigns & Meta Templates' : 'ব্রডকাস্ট ক্যাম্পেইন ও মেটা টেমপ্লেট'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'en' ? 'Create WhatsApp Meta-approved templates and execute bulk marketing campaigns.' : 'হোয়াটসঅ্যাপের মেটা-অ্যাপ্রুভড টেমপ্লেট তৈরি করুন এবং বাল্ক ব্রডকাস্ট পাঠান।'}
          </p>
        </div>
        <button 
          onClick={() => activeTab === 'campaigns' ? setIsCampaignModalOpen(true) : setIsTemplateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus className="w-4 h-4" /> 
          {activeTab === 'campaigns' 
            ? (language === 'en' ? 'New Campaign' : 'নতুন ক্যাম্পেইন') 
            : (language === 'en' ? 'New Meta Template' : 'নতুন মেটা টেমপ্লেট')}
        </button>
      </div>

      {/* Guidelines Accordion */}
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3 text-blue-400">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-[14px]">
            {language === 'en' ? 'Meta Official Template Guidelines' : 'মেটা (Meta) অফিশিয়াল টেমপ্লেট নিয়মাবলী'}
          </h3>
          <ul className="list-disc list-inside text-[12px] opacity-90 space-y-0.5">
            <li>{language === 'en' ? 'Template names must only use lowercase letters, numbers, and underscores (e.g. eid_promo_2026).' : 'টেমপ্লেটের নাম শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা এবং আন্ডারস্কোর (_) দিয়ে লিখতে হবে।'}</li>
            <li>{language === 'en' ? 'Sample values are MANDATORY for variables like {{1}}, {{2}} to prevent instant Meta rejection.' : 'মেসেজে {{1}}, {{2}} থাকলে নিচে অবশ্যই স্যাম্পল মান দিতে হবে, অন্যথায় মেটা রিজেক্ট করবে।'}</li>
            <li>{language === 'en' ? 'Meta AI auto-reviews templates usually within 1 minute to 24 hours.' : 'মেটা এআই সাধারণ ১ মিনিট থেকে ২৪ ঘণ্টার মধ্যে টেমপ্লেট রিভিউ সম্পন্ন করে।'}</li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface-hover/30 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'campaigns' ? 'bg-primary text-primary-foreground shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Campaigns' : 'ক্যাম্পেইনস'}
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'templates' ? 'bg-primary text-primary-foreground shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Message Templates' : 'মেসেজ টেমপ্লেটস'}
        </button>
      </div>

      {/* Content List */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-surface-hover/50 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="space-y-3">
            {(activeTab === 'campaigns' ? broadcasts : templates).length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-[13px]">
                {language === 'en' ? 'No items found.' : 'কোনো তথ্য পাওয়া যায়নি।'}
              </div>
            ) : (
              (activeTab === 'campaigns' ? broadcasts : templates).map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 bg-background/50 border border-surface-hover rounded-xl hover:border-primary/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-bold">{activeTab === 'campaigns' ? (item.template?.name || 'Unnamed Campaign') : item.name}</h3>
                      {activeTab === 'templates' && (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                          item.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          'bg-orange-500/10 text-orange-500'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-[12px] text-zinc-400">
                      {activeTab === 'campaigns' ? (
                        <>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(item.scheduledAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {item._count?.recipients || 0} {language === 'en' ? 'Recipients' : 'গ্রাহক'}</span>
                          <span className="capitalize px-2 py-0.5 bg-secondary/10 text-secondary rounded-full font-bold">{item.status}</span>
                        </>
                      ) : (
                        <>
                          <span className="capitalize px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold">{item.category}</span>
                          <span>Language: {item.language}</span>
                          <span>Header: {item.headerFormat}</span>
                        </>
                      )}
                    </div>

                    {activeTab === 'templates' && item.bodyText && (
                      <p className="text-[12px] text-zinc-400 bg-surface-hover/30 p-2 rounded-lg font-mono line-clamp-2 max-w-2xl">
                        {item.bodyText}
                      </p>
                    )}

                    {activeTab === 'templates' && item.rejectionReason && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] rounded-lg">
                        <strong>Meta Rejection Reason:</strong> {item.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTab === 'campaigns' && item.status === 'scheduled' && (
                      <button className="w-8 h-8 flex items-center justify-center bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20">
                        <Play className="w-4 h-4 ml-0.5" />
                      </button>
                    )}
                    {activeTab === 'templates' && (
                      <button 
                        onClick={() => handleDeleteTemplate(item.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={language === 'en' ? 'Delete template' : 'টেমপ্লেট মুছুন'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-hover w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-surface-hover shrink-0">
              <h2 className="text-lg font-bold">{language === 'en' ? 'Create New Broadcast Campaign' : 'নতুন ব্রডকাস্ট ক্যাম্পেইন'}</h2>
              <button onClick={() => setIsCampaignModalOpen(false)} className="p-1 hover:bg-surface-hover rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Campaign Title' : 'ক্যাম্পেইনের নাম'}</label>
                <input 
                  type="text" 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors" 
                  placeholder={language === 'en' ? 'e.g. Eid Discount Offer' : 'উদাঃ ঈদ ছাড় অফার'} 
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Select Meta-Approved Template' : 'অ্যাপ্রুভড টেমপ্লেট বেছে নিন'}</label>
                <select 
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                >
                  <option value="">{language === 'en' ? 'Select an approved template...' : 'একটি অ্যাপ্রুভড টেমপ্লেট নির্বাচন করুন...'}</option>
                  {templates.filter(t => t.status === 'APPROVED').map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
                {templates.filter(t => t.status === 'APPROVED').length === 0 && (
                  <p className="text-[11px] text-orange-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {language === 'en' ? 'No Meta-APPROVED templates available yet. Please create and wait for Meta approval.' : 'কোনো Meta-APPROVED টেমপ্লেট নেই। দয়া করে আগে টেমপ্লেট সাবমিট করে মেটা অ্যাপ্রুভালের জন্য অপেক্ষা করুন।'}
                  </p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-surface-hover flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsCampaignModalOpen(false)} className="px-4 py-2 text-[13px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover rounded-xl transition-all">
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button 
                onClick={handleCreateCampaign}
                disabled={isSubmitting || templates.filter(t => t.status === 'APPROVED').length === 0}
                className="px-4 py-2 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (language === 'en' ? 'Scheduling...' : 'শিডিউল হচ্ছে...') : (language === 'en' ? 'Schedule Broadcast' : 'ব্রডকাস্ট শিডিউল করুন')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL TEMPLATE BUILDER MODAL WITH REAL-TIME WHATSAPP PHONE PREVIEW */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-surface border border-surface-hover w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-surface-hover shrink-0">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {language === 'en' ? 'Meta WhatsApp Template Builder' : 'মেটা হোয়াটসঅ্যাপ টেমপ্লেট বিল্ডার'}
                </h2>
                <p className="text-xs text-zinc-400">{language === 'en' ? 'Build, sample test, and submit templates directly to Meta API.' : 'টেমপ্লেট সাজান, স্যাম্পল টেস্ট করুন এবং মেটা এপিআই-তে পাঠান।'}</p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-1 hover:bg-surface-hover rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 p-6 overflow-y-auto space-y-5 border-r border-surface-hover">
                {/* 1. Identity & Language */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{language === 'en' ? '1. Template Identity' : '১. টেমপ্লেট আইডেন্টিটি'}</h3>
                  <div>
                    <label className="block text-[12px] font-bold text-zinc-400 mb-1">
                      {language === 'en' ? 'Template Name' : 'টেমপ্লেটের নাম'} <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={templateName}
                      onChange={(e) => handleTemplateNameChange(e.target.value)}
                      className={`w-full bg-background border ${nameError ? 'border-red-500' : 'border-surface-hover'} rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors`}
                      placeholder="e.g. eid_offer_2026" 
                    />
                    {nameError ? (
                      <p className="text-[11px] text-red-400 mt-1">{nameError}</p>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mt-1">{language === 'en' ? 'Lowercase letters, numbers, and underscores only.' : 'শুধুমাত্র ছোট হাতের অক্ষর, সংখ্যা ও আন্ডারস্কোর।'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Category' : 'ক্যাটাগরি'}</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                      >
                        <option value="MARKETING">MARKETING</option>
                        <option value="UTILITY">UTILITY</option>
                        <option value="AUTHENTICATION">AUTHENTICATION</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Language' : 'ভাষা'}</label>
                      <select 
                        value={templateLanguage}
                        onChange={(e) => setTemplateLanguage(e.target.value)}
                        className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                      >
                        <option value="bn">Bengali (bn)</option>
                        <option value="en_US">English (en_US)</option>
                        <option value="ar">Arabic (ar)</option>
                        <option value="hi">Hindi (hi)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Header Section */}
                <div className="space-y-3 pt-3 border-t border-surface-hover">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{language === 'en' ? '2. Header (Optional)' : '২. হেডার (ঐচ্ছিক)'}</h3>
                  <div>
                    <label className="block text-[12px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Header Format' : 'হেডার ফরম্যাট'}</label>
                    <select 
                      value={headerFormat}
                      onChange={(e: any) => setHeaderFormat(e.target.value)}
                      className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                    >
                      <option value="NONE">NONE</option>
                      <option value="TEXT">TEXT (Max 100 chars)</option>
                      <option value="IMAGE">IMAGE (JPG / PNG)</option>
                      <option value="DOCUMENT">DOCUMENT (PDF)</option>
                      <option value="VIDEO">VIDEO (MP4)</option>
                    </select>
                  </div>

                  {headerFormat === 'TEXT' && (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        maxLength={100}
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors" 
                        placeholder={language === 'en' ? 'e.g. Special Offer {{1}}' : 'উদাঃ বিশেষ অফার {{1}}'}
                      />
                      {Object.keys(headerSamples).map(key => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400 shrink-0">Sample for Header {"{{" + key + "}}"}:</span>
                          <input 
                            type="text" 
                            value={headerSamples[key] || ''}
                            onChange={(e) => setHeaderSamples({ ...headerSamples, [key]: e.target.value })}
                            className="w-full bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px] outline-none focus:border-primary"
                            placeholder="e.g. Eid 2026"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {['IMAGE', 'DOCUMENT', 'VIDEO'].includes(headerFormat) && (
                    <div>
                      <label className="block text-[12px] font-bold text-zinc-400 mb-1">{language === 'en' ? 'Upload Header Media Sample' : 'হেডার মিডিয়া ফাইল আপলোড'}</label>
                      <input 
                        type="file" 
                        accept={headerFormat === 'IMAGE' ? 'image/*' : headerFormat === 'DOCUMENT' ? 'application/pdf' : 'video/*'}
                        onChange={handleFileChange}
                        className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[12px] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-primary/20 file:text-primary"
                      />
                    </div>
                  )}
                </div>

                {/* 3. Body Section */}
                <div className="space-y-3 pt-3 border-t border-surface-hover">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{language === 'en' ? '3. Body Text' : '৩. মেসেজ বডি'} <span className="text-red-400">*</span></h3>
                    <button 
                      type="button"
                      onClick={handleAddVariable}
                      className="px-2.5 py-1 bg-surface-hover text-zinc-300 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                    >
                      + Add Variable {"{{n}}"}
                    </button>
                  </div>

                  <textarea 
                    ref={bodyTextareaRef}
                    rows={4}
                    maxLength={1024}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full bg-background border border-surface-hover rounded-xl p-3 text-[13px] outline-none focus:border-primary transition-colors font-sans"
                    placeholder={language === 'en' ? 'Hello {{1}}, your order {{2}} is confirmed...' : 'প্রিয় {{1}}, আপনার জন্য রয়েছে {{2}}% ছাড়!...'}
                  ></textarea>

                  {/* 4. Variables Sample Inputs */}
                  {Object.keys(bodySamples).length > 0 && (
                    <div className="p-3 bg-surface-hover/30 border border-surface-hover rounded-xl space-y-2">
                      <h4 className="text-[12px] font-bold text-zinc-300">{language === 'en' ? 'Variable Samples (Mandatory for Meta Approval)' : 'ভ্যারিয়েবল স্যাম্পল ভ্যালু (মেটা অ্যাপ্রুভালের জন্য বাধ্যতামূলক)'}</h4>
                      {Object.keys(bodySamples).map(key => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-primary shrink-0">Sample for {"{{" + key + "}}"}:</span>
                          <input 
                            type="text" 
                            value={bodySamples[key] || ''}
                            onChange={(e) => setBodySamples({ ...bodySamples, [key]: e.target.value })}
                            className="w-full bg-background border border-surface-hover rounded-lg px-2.5 py-1 text-[12px] outline-none focus:border-primary"
                            placeholder={key === '1' ? 'e.g. Rahim' : 'e.g. 20'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Footer Section */}
                <div className="space-y-2 pt-3 border-t border-surface-hover">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{language === 'en' ? '4. Footer (Optional)' : '৪. ফুটাত (ঐচ্ছিক)'}</h3>
                  <input 
                    type="text" 
                    maxLength={60}
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] outline-none focus:border-primary transition-colors"
                    placeholder={language === 'en' ? 'e.g. Valid till 30 July' : 'উদাঃ অফারের মেয়াদ ৩০ জুলাই পর্যন্ত'}
                  />
                </div>

                {/* 6. Buttons Section */}
                <div className="space-y-3 pt-3 border-t border-surface-hover">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">{language === 'en' ? '5. Buttons (Optional)' : '৫. বাটনসমূহ (ঐচ্ছিক)'}</h3>
                    <button 
                      type="button"
                      onClick={handleAddButton}
                      className="px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-[11px] font-bold transition-colors"
                    >
                      + Add Button
                    </button>
                  </div>

                  {buttons.map((btn, index) => (
                    <div key={index} className="p-3 bg-surface-hover/20 border border-surface-hover rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-zinc-400">Button #{index + 1}</span>
                        <button type="button" onClick={() => handleRemoveButton(index)} className="text-red-400 hover:text-red-300 text-[11px]">Remove</button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <select 
                          value={btn.type}
                          onChange={(e) => handleButtonChange(index, 'type', e.target.value)}
                          className="bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px]"
                        >
                          <option value="QUICK_REPLY">QUICK REPLY</option>
                          <option value="URL">CALL TO ACTION (URL)</option>
                          <option value="PHONE_NUMBER">CALL TO ACTION (PHONE)</option>
                        </select>

                        <input 
                          type="text"
                          value={btn.text}
                          onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                          placeholder="Button Label (e.g. Buy Now)"
                          className="bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px]"
                        />
                      </div>

                      {btn.type === 'URL' && (
                        <div className="space-y-1">
                          <input 
                            type="text"
                            value={btn.url}
                            onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                            placeholder="https://example.com/order/{{1}}"
                            className="w-full bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px]"
                          />
                          {btn.url?.includes('{{1}}') && (
                            <input 
                              type="text"
                              value={btn.sample || ''}
                              onChange={(e) => handleButtonChange(index, 'sample', e.target.value)}
                              placeholder="Sample for URL {{1}} (e.g. discount)"
                              className="w-full bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px]"
                            />
                          )}
                        </div>
                      )}

                      {btn.type === 'PHONE_NUMBER' && (
                        <input 
                          type="text"
                          value={btn.phoneNumber}
                          onChange={(e) => handleButtonChange(index, 'phoneNumber', e.target.value)}
                          placeholder="+8801700000000"
                          className="w-full bg-background border border-surface-hover rounded-lg px-2 py-1 text-[12px]"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Live Phone Mockup (5 cols) */}
              <div className="lg:col-span-5 bg-black/40 p-6 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="text-center mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-primary" />
                    {language === 'en' ? 'Live WhatsApp Phone Preview' : 'লাইভ হোয়াটসঅ্যাপ ফোন প্রিভিউ'}
                  </span>
                </div>

                {/* Smartphone Frame */}
                <div className="w-[300px] h-[560px] bg-[#111b21] border-4 border-zinc-700 rounded-[36px] shadow-2xl flex flex-col overflow-hidden relative">
                  {/* Phone Top Speaker Bar */}
                  <div className="h-5 bg-[#202c33] shrink-0 flex justify-center items-center">
                    <div className="w-12 h-1.5 bg-zinc-600 rounded-full"></div>
                  </div>

                  {/* WhatsApp Header */}
                  <div className="bg-[#202c33] px-3 py-2 flex items-center gap-2 border-b border-zinc-700/50 shrink-0">
                    <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                      Z
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-zinc-100">ZiniChat Business</h4>
                      <p className="text-[9px] text-zinc-400">Official Business Account</p>
                    </div>
                  </div>

                  {/* Chat Wallpaper & Message Bubble Area */}
                  <div className="flex-1 bg-[#0b141a] p-3 overflow-y-auto space-y-2 flex flex-col justify-end">
                    {/* WhatsApp Chat Bubble */}
                    <div className="bg-[#005c4b] text-white rounded-lg p-2.5 shadow-md max-w-[90%] self-start space-y-1.5 font-sans border border-green-700/30 animate-in fade-in duration-300">
                      
                      {/* Header Preview */}
                      {headerFormat === 'TEXT' && headerText && (
                        <div className="font-bold text-[13px] border-b border-white/10 pb-1 text-zinc-100">
                          {getRenderedHeaderText()}
                        </div>
                      )}

                      {headerFormat === 'IMAGE' && (
                        <div className="rounded-md overflow-hidden bg-black/20 max-h-36">
                          {headerFilePreview ? (
                            <img src={headerFilePreview} alt="Header" className="w-full object-cover" />
                          ) : (
                            <div className="p-4 text-center text-xs text-zinc-300 flex flex-col items-center gap-1">
                              <ImageIcon className="w-6 h-6 text-zinc-400" />
                              <span>Image Sample</span>
                            </div>
                          )}
                        </div>
                      )}

                      {headerFormat === 'DOCUMENT' && (
                        <div className="p-2 bg-black/20 rounded flex items-center gap-2 text-xs">
                          <FileText className="w-5 h-5 text-red-400" />
                          <span className="truncate">{headerFile ? headerFile.name : 'Document.pdf'}</span>
                        </div>
                      )}

                      {headerFormat === 'VIDEO' && (
                        <div className="p-3 bg-black/20 rounded flex items-center justify-center text-xs gap-1">
                          <Video className="w-5 h-5 text-blue-400" />
                          <span>Video Sample</span>
                        </div>
                      )}

                      {/* Body Preview */}
                      <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-zinc-100 font-sans">
                        {getRenderedBodyPreview()}
                      </div>

                      {/* Footer Preview */}
                      {footerText && (
                        <div className="text-[10px] text-zinc-300/80 pt-1 border-t border-white/10 italic">
                          {footerText}
                        </div>
                      )}

                      {/* Timestamp & Checks */}
                      <div className="flex justify-end items-center gap-1 text-[9px] text-zinc-300/70 pt-0.5">
                        <span>10:45 AM</span>
                        <CheckCheck className="w-3 h-3 text-sky-300" />
                      </div>
                    </div>

                    {/* Action Buttons Preview */}
                    {buttons.length > 0 && (
                      <div className="space-y-1 max-w-[90%] self-start w-full">
                        {buttons.map((btn, i) => (
                          <div key={i} className="bg-[#202c33] text-sky-400 hover:bg-[#2a3942] rounded-lg py-1.5 px-3 text-center text-[11px] font-bold shadow flex items-center justify-center gap-1.5 border border-zinc-700">
                            {btn.type === 'URL' && <Link className="w-3 h-3" />}
                            {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
                            <span>{btn.text || `Button #${i+1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-hover flex justify-end gap-2 shrink-0 bg-surface">
              <button 
                onClick={() => setIsTemplateModalOpen(false)} 
                className="px-4 py-2 text-[13px] font-bold text-zinc-400 hover:text-zinc-200 hover:bg-surface-hover rounded-xl transition-all"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button 
                onClick={handleSubmitTemplate}
                disabled={isSubmitting || !templateName || !!nameError || !bodyText}
                className="px-5 py-2 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitting ? (language === 'en' ? 'Submitting to Meta...' : 'মেটাতে সাবমিট হচ্ছে...') : (language === 'en' ? 'Submit for Meta Approval' : 'মেটা অ্যাপ্রুভালের জন্য পাঠান')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
