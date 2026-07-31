'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import { Bot, Key, Save, AlertCircle, RefreshCw, MessageSquare, Plus, Edit2, Trash2, X, Check, Wand2, Eye, Lock, Sliders, Sparkles, ShieldCheck } from 'lucide-react';
import InstructionBanner from '@/components/InstructionBanner';

export default function AiTrainingPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'default' | 'custom'>('default');
  
  // Feature Gating Checks
  const canOrderPlacement = useFeature('ai_tool_order_placement');
  const canImageReading = useFeature('ai_tool_image_reading');
  const canSupportDetection = useFeature('ai_tool_support_detection');
  const canProductMatching = useFeature('ai_tool_product_matching');

  // Config state
  const [config, setConfig] = useState<any>({
    routingMode: 'system_only',
    hasCustomKey: false,
    allowByok: false,
    planName: '',
    aiQuota: 0,
    isActive: true,
    replyWhenAssigned: false,
    agentName: ''
  });
  const [apiKey, setApiKey] = useState('');
  
  // Event-wise AI Tools state
  const [tools, setTools] = useState<Record<string, { isEnabled: boolean; configJson: any }>>({
    order_placement: { isEnabled: true, configJson: {} },
    image_reading: { isEnabled: true, configJson: {} },
    support_detection: { isEnabled: false, configJson: {} },
    product_matching: { isEnabled: false, configJson: {} }
  });

  // Q&A state
  const [qnas, setQnas] = useState<any[]>([]);
  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false);
  const [qnaForm, setQnaForm] = useState({ id: '', question: '', answer: '', isDefault: false });

  // Document state
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [configRes, toolsRes, qnaRes, docsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/tools`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents`, { headers })
      ]);
      
      if (configRes.ok) setConfig(await configRes.json());
      if (toolsRes.ok) {
        const toolsList = await toolsRes.json();
        const map: Record<string, { isEnabled: boolean; configJson: any }> = {};
        (toolsList || []).forEach((t: any) => {
          map[t.toolType] = { isEnabled: t.isEnabled, configJson: t.configJson };
        });
        setTools(prev => ({ ...prev, ...map }));
      }
      if (qnaRes.ok) setQnas(await qnaRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleTool = async (toolType: string, newEnabled: boolean) => {
    // Optimistic UI update
    setTools(prev => ({
      ...prev,
      [toolType]: { ...prev[toolType], isEnabled: newEnabled }
    }));

    try {
      const token = Cookies.get('access_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/tools/${toolType}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: newEnabled })
      });
    } catch (err) {
      console.error('Failed to toggle AI tool', err);
      fetchData(); // Rollback on error
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const body: any = { 
        routingMode: config.routingMode,
        aiOrderEnabled: config.aiOrderEnabled,
        isActive: config.isActive,
        replyWhenAssigned: config.replyWhenAssigned,
        agentName: config.agentName
      };
      if (apiKey) body.apiKey = apiKey;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config/byok`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setApiKey(''); // Clear input for security
        fetchData();
        alert(language === 'en' ? 'Settings saved successfully' : 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSave = async (updates: any) => {
    try {
      const token = Cookies.get('access_token');
      const body: any = { 
        routingMode: config.routingMode,
        aiOrderEnabled: config.aiOrderEnabled,
        isActive: config.isActive,
        replyWhenAssigned: config.replyWhenAssigned,
        agentName: config.agentName,
        ...updates
      };

      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config/byok`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQna = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      let res;
      if (qnaForm.id) {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna/${qnaForm.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ question: qnaForm.question, answer: qnaForm.answer })
        });
      } else {
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ question: qnaForm.question, answer: qnaForm.answer })
        });
      }

      if (res.ok) {
        setIsQnaModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Error saving Q&A');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQna = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this question?' : 'আপনি কি নিশ্চিত যে এই প্রশ্নটি মুছে ফেলতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const token = Cookies.get('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm(language === 'en' ? 'Delete this document?' : 'এই ডকুমেন্টটি কি মুছে ফেলতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const toolDefinitions = [
    {
      type: 'order_placement',
      titleEn: 'Order Placement',
      titleBn: 'অর্ডার প্লেসমেন্ট',
      descEn: 'AI will place confirmed orders directly and reply with an order number.',
      descBn: 'এআই কনফার্ম করা কাস্টমার অর্ডারের অটো প্লেসমেন্ট করবে এবং অর্ডার নম্বর দেবে।',
      allowed: canOrderPlacement
    },
    {
      type: 'image_reading',
      titleEn: 'Image Reading',
      titleBn: 'ইমেজ রিডিং (ভিশন)',
      descEn: 'AI will look at photos customers send and analyze products.',
      descBn: 'কাস্টমারদের পাঠানো পণ্যের ছবি দেখে এআই প্রডাক্ট নাম ও বিবরণ বিশ্লেষণ করবে।',
      allowed: canImageReading
    },
    {
      type: 'support_detection',
      titleEn: 'Support Detection',
      titleBn: 'সাপোর্ট ডিটেকশন',
      descEn: 'AI will detect when a customer needs a human (including refund/returns) and flag for your team.',
      descBn: 'কাস্টমারের রিফান্ড/রিটার্ন বা সরাসরি হিউম্যান এজেন্ট সহায়তার প্রয়োজন হলে টিমের কাছে টিকিট ফ্ল্যাগ করবে।',
      allowed: canSupportDetection
    },
    {
      type: 'product_matching',
      titleEn: 'Product Photo Matching',
      titleBn: 'প্রডাক্ট ফটো ম্যাচিং',
      descEn: 'AI will suggest a matching product photo from your catalog when relevant.',
      descBn: 'কাস্টমারের চাহিদা অনুযায়ী প্রাসঙ্গিক পণ্যের ছবি ক্যাটালগ থেকে অটো রিগ্রুপ করে পাঠাবে।',
      allowed: canProductMatching
    }
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10 text-foreground">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Bot className="w-6 h-6 text-primary" />
          {language === 'en' ? 'AI Assistant Training & Tools' : 'এআই অ্যাসিস্ট্যান্ট ট্রেইনিং ও টুলস'}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1 font-sans">
          {language === 'en'
            ? 'Configure your business information, event-wise AI behavior toggles, and knowledge base.'
            : 'আপনার ব্যবসার তথ্য, ইভেন্ট-ভিত্তিক এআই আচরণ এবং নলেজ বেস কনফিগার করুন।'}
        </p>
      </div>

      <InstructionBanner
        title={language === 'en' ? 'How to Train Your AI Agent' : 'কীভাবে আপনার এআই এজেন্টকে ট্রেইন করবেন'}
        description={
          language === 'en'
            ? '1. Keep "Enable AI Agent" ON to answer customer queries. 2. Fill out Business Info Q&A so AI knows your delivery policy, timing & store location. 3. Enable Event-Wise AI Behavior toggles below to control order placement, image reading & support handover.'
            : '১. কাস্টমার মেসেজের অটো রিপ্লাইয়ের জন্য "এআই এজেন্ট चालू" রাখুন। ২. ব্যবসার সময়সূচী, ডেলিভারি চার্জ ও ঠিকানা জানাতে Q&A সেকশন পূরণ করুন। ৩. অটো অর্ডার প্লেসমেন্ট ও সাপোর্ট হ্যান্ডওভার কন্ট্রোল করতে নিচের ইভেন্ট টগলসমূহ অন করুন।'
        }
      />

      {/* Master Toggle */}
      <div className="bg-card border border-border shadow-md rounded-xl p-4 flex flex-col gap-4 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">
                {language === 'en' ? 'Enable AI Agent' : 'এআই এজেন্ট চালু করুন'}
              </h2>
              <p className="text-[13px] text-muted-foreground font-sans">
                {language === 'en' ? 'Turn this off to completely pause AI responses.' : 'এআই রিপ্লাই সম্পূর্ণ বন্ধ করতে এটি অফ করুন।'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.isActive ?? true}
              onChange={(e) => {
                const val = e.target.checked;
                setConfig({ ...config, isActive: val });
                handleQuickSave({ isActive: val });
              }}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* AI Agent Name */}
        <div className="pt-3 mt-1 border-t border-border">
          <label className="block text-[13px] font-bold text-foreground mb-1">
            {language === 'en' ? 'AI Agent Name' : 'এআই এজেন্টের নাম'}
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={language === 'en' ? 'e.g., Zini, Sarah, SupportBot' : 'যেমন: জিনী, সারা, সাপোর্টবট'}
              value={config.agentName || ''}
              onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-[13px] text-foreground focus:outline-none focus:border-primary"
            />
            <button 
              onClick={() => handleQuickSave({ agentName: config.agentName })}
              className="px-4 py-1.5 bg-secondary text-white rounded-xl text-[12px] font-bold hover:bg-secondary/90 transition-all shrink-0 cursor-pointer"
            >
              {language === 'en' ? 'Save Name' : 'নাম সেভ করুন'}
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Event-Wise AI Behavior Section */}
      <div className="bg-card border border-border shadow-md rounded-xl p-4 animate-in fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-bold text-foreground text-sm">
              {language === 'en' ? 'Event-Wise AI Behavior' : 'ইভেন্ট-ভিত্তিক এআই আচরণ'}
            </h2>
            <p className="text-[12px] text-muted-foreground font-sans">
              {language === 'en' ? 'Control exactly when and how the AI executes actions for your customers.' : 'কাস্টমার মেসেজের নির্দিষ্ট ইভেন্টে এআই কীভাবে সিদ্ধান্ত নেবে তা অন/অফ করুন।'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {toolDefinitions.map(tool => {
            const toolState = tools[tool.type] || { isEnabled: false };
            const isAllowed = tool.allowed;

            return (
              <div 
                key={tool.type} 
                className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                  !isAllowed 
                    ? 'bg-muted/40 border-border opacity-75' 
                    : toolState.isEnabled 
                    ? 'bg-primary/5 border-primary/30' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-[13px] text-foreground">
                      {tool.type === 'order_placement' && <Sparkles className="w-4 h-4 text-emerald-600" />}
                      {tool.type === 'image_reading' && <Eye className="w-4 h-4 text-blue-600" />}
                      {tool.type === 'support_detection' && <ShieldCheck className="w-4 h-4 text-amber-600" />}
                      {tool.type === 'product_matching' && <Wand2 className="w-4 h-4 text-purple-600" />}
                      {language === 'en' ? tool.titleEn : tool.titleBn}
                      {!isAllowed && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                          <Lock className="w-3 h-3" /> Plan Upgrade Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                      {language === 'en' ? tool.descEn : tool.descBn}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      disabled={!isAllowed}
                      checked={isAllowed && toolState.isEnabled}
                      onChange={(e) => handleToggleTool(tool.type, e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className={`w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer ${
                      isAllowed ? 'peer-checked:after:translate-x-full peer-checked:bg-primary cursor-pointer' : 'cursor-not-allowed opacity-50'
                    } after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all`}></div>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-3">
        <button 
          onClick={() => setActiveTab('default')}
          className={`px-3 py-2 font-medium text-[13px] border-b-2 transition-colors cursor-pointer ${activeTab === 'default' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {language === 'en' ? 'Business Info' : 'ব্যবসার তথ্য'}
        </button>
        <button 
          onClick={() => setActiveTab('custom')}
          className={`px-3 py-2 font-medium text-[13px] border-b-2 transition-colors cursor-pointer ${activeTab === 'custom' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {language === 'en' ? 'Custom Prompt & Docs' : 'কাস্টম প্রম্পট ও ফাইল'}
        </button>
        <button 
          onClick={() => setActiveTab('api')}
          className={`px-3 py-2 font-medium text-[13px] border-b-2 transition-colors cursor-pointer ${activeTab === 'api' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {language === 'en' ? 'API Settings' : 'API সেটিংস'}
        </button>
      </div>

      {/* Section 1: API Routing Settings */}
      {activeTab === 'api' && (
        <div className="bg-card border border-border rounded-2xl p-4 animate-in fade-in duration-300">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-primary" /> 
            {language === 'en' ? 'AI Usage & API Settings' : 'এআই ব্যবহার ও API সেটিংস'}
          </h2>

          <div className="bg-background rounded-xl p-3 mb-3 flex items-center justify-between border border-border">
            <div>
              <div className="text-[13px] text-muted-foreground">{language === 'en' ? 'Current Plan' : 'বর্তমান প্যাকেজ'}</div>
              <div className="font-bold text-[13px]">{config.planName}</div>
            </div>
            <div className="text-right">
              <div className="text-[13px] text-muted-foreground">{language === 'en' ? 'Platform AI Quota' : 'প্ল্যাটফর্ম এআই কোটা'}</div>
              <div className="font-bold text-[13px] text-primary">{config.aiQuota.toLocaleString()} {language === 'en' ? 'মেসেজ/মাস' : 'মেসেজ/মাস'}</div>
            </div>
          </div>

          {config.allowByok ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium mb-1.5 text-foreground">
                  {language === 'en' ? 'API Routing Mode' : 'API রাউটিং মোড'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                  <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'system_only' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-zinc-500'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="radio" name="routing" value="system_only" checked={config.routingMode === 'system_only'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-border" />
                      <span className="font-bold text-[13px]">System Quota Only</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-sans">Use ZiniChat platform monthly credits. No API key required.</span>
                  </label>

                  <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'custom_only' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-zinc-500'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="radio" name="routing" value="custom_only" checked={config.routingMode === 'custom_only'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-border" />
                      <span className="font-bold text-[13px]">Your Own Key Only</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-sans">Route 100% of AI requests through your personal OpenAI API key.</span>
                  </label>

                  <label className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'hybrid' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-zinc-500'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="radio" name="routing" value="hybrid" checked={config.routingMode === 'hybrid'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-border" />
                      <span className="font-bold text-[13px]">Hybrid (Fallback)</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-sans">Use System credits first, then fallback to your API key if quota is full.</span>
                  </label>
                </div>
              </div>

              {config.routingMode !== 'system_only' && (
                <div className="bg-background p-3 rounded-xl border border-border space-y-3">
                  <div>
                    <label className="block text-[13px] font-medium mb-1">
                      {language === 'en' ? 'OpenAI API Key' : 'OpenAI API Key'}
                    </label>
                    <input 
                      type="password"
                      placeholder={config.hasCustomKey ? '•••••••••••••••••••• (Saved - enter new key to replace)' : 'sk-proj-...'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      {language === 'en' ? 'Your API key is encrypted securely with AES-256 before storage.' : 'আপনার API Key নিরাপদভাবে AES-256 দিয়ে এনক্রিপ্ট করা থাকে।'}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-[13px] hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {language === 'en' ? 'Save API Routing' : 'API সেভ করুন'}
              </button>
            </div>
          ) : (
            <div className="bg-muted/10 p-4 rounded-xl border border-border text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-400 mx-auto" />
              <div className="font-bold text-[13px] text-foreground">
                {language === 'en' ? 'BYOK (Bring Your Own Key) is disabled on your plan' : 'আপনার প্যাকেজে BYOK অন করার অনুমতি নেই'}
              </div>
              <p className="text-[12px] text-muted-foreground max-w-md mx-auto font-sans">
                {language === 'en' 
                  ? 'Your current plan uses ZiniChat system AI quota. Upgrade your plan to use your custom OpenAI API key.'
                  : 'আপনার বর্তমান প্যাকেজে প্ল্যাটফর্মের এআই কোটা ব্যবহার হচ্ছে। নিজের API Key ব্যবহার করতে প্যাকেজ আপগ্রেড করুন।'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Default Business Questions */}
      {activeTab === 'default' && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {language === 'en' ? 'Business Q&A Knowledge Base' : 'ব্যবসার সাধারণ প্রশ্নোত্তর (Q&A)'}
              </h2>
              <p className="text-[12px] text-muted-foreground font-sans">
                {language === 'en' ? 'Answer these questions so AI can respond accurately to customers.' : 'এই সাধারণ প্রশ্নগুলোর উত্তর লিখে রাখুন যেন কাস্টমার জিজ্ঞাসা করলে এআই সঠিক রিপ্লাই দেয়।'}
              </p>
            </div>
            <button
              onClick={() => {
                setQnaForm({ id: '', question: '', answer: '', isDefault: false });
                setIsQnaModalOpen(true);
              }}
              className="px-3 py-1.5 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {language === 'en' ? 'Add Q&A' : 'প্রশ্ন যোগ করুন'}
            </button>
          </div>

          <div className="space-y-3">
            {qnas.map((qna) => (
              <div key={qna.id} className="bg-background border border-border rounded-xl p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-[13px] text-foreground flex items-center gap-2">
                    <span>{qna.question}</span>
                    {qna.isDefault && (
                      <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setQnaForm({ id: qna.id, question: qna.question, answer: qna.answer || '', isDefault: qna.isDefault });
                        setIsQnaModalOpen(true);
                      }}
                      className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!qna.isDefault && (
                      <button
                        onClick={() => handleDeleteQna(qna.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[12px] text-foreground bg-card p-2.5 rounded-lg border border-border/50">
                  {qna.answer ? qna.answer : <span className="text-muted-foreground italic font-sans">{language === 'en' ? 'No answer provided yet. Click edit to add.' : 'এখনও উত্তর লেখা হয়নি। এডিট বাটনে ক্লিক করুন।'}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Custom System Prompt & Document Upload */}
      {activeTab === 'custom' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-card border border-border shadow-md rounded-2xl p-4">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-primary" />
              {language === 'en' ? 'System Prompt Instructions' : 'সিস্টেম প্রম্পট ইনস্ট্রাকশন'}
            </h2>
            <p className="text-[12px] text-muted-foreground mb-3 font-sans">
              {language === 'en' ? 'Guide the AI on its personality, tone, and specific rules.' : 'এআই-এর আচরণ, টোন এবং বিশেষ নির্দেশনাসমূহ লিখে দিন।'}
            </p>

            <textarea
              rows={6}
              value={config.systemPrompt || ''}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              className="w-full bg-background border border-border rounded-xl p-3 text-[13px] text-foreground focus:outline-none focus:border-primary font-mono"
              placeholder="You are a polite sales assistant..."
            />

            <div className="flex justify-end mt-3">
              <button
                onClick={() => handleQuickSave({ systemPrompt: config.systemPrompt })}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {language === 'en' ? 'Save Prompt' : 'প্রম্পট সেভ করুন'}
              </button>
            </div>
          </div>

          <div className="bg-card border border-border shadow-md rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  {language === 'en' ? 'Document Upload (PDF/Word/Images)' : 'ডকুমেন্ট আপলোড (PDF/Word/ছবি)'}
                </h2>
                <p className="text-[12px] text-muted-foreground font-sans">
                  {language === 'en' ? 'Upload up to 2 documents (max 1MB each) for AI context.' : 'সর্বোচ্চ ২টি ফাইল (প্রতিটি ১ মেগাবাইট) আপলোড করতে পারবেন।'}
                </p>
              </div>

              {documents.length < 2 && (
                <label className="px-3 py-1.5 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5">
                  {uploadingDoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {language === 'en' ? 'Upload File' : 'ফাইল আপলোড'}
                  <input type="file" onChange={handleUploadDoc} className="hidden" accept=".pdf,.docx,.txt,image/*" />
                </label>
              )}
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[13px] text-foreground">{doc.filename}</div>
                    <div className="text-[11px] text-muted-foreground">Status: <span className="text-emerald-400 font-semibold">{doc.status}</span></div>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-[12px]">
                  {language === 'en' ? 'No documents uploaded yet.' : 'এখনও কোনো ফাইল আপলোড করা হয়নি।'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Q&A Modal */}
      {isQnaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-4 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-base">
                {qnaForm.id 
                  ? (language === 'en' ? 'Edit Question & Answer' : 'প্রশ্ন ও উত্তর এডিট করুন') 
                  : (language === 'en' ? 'Add Custom Question' : 'নতুন প্রশ্ন যোগ করুন')}
              </h3>
              <button onClick={() => setIsQnaModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                  {language === 'en' ? 'Question' : 'প্রশ্ন'}
                </label>
                <input
                  type="text"
                  disabled={qnaForm.isDefault}
                  value={qnaForm.question}
                  onChange={(e) => setQnaForm({ ...qnaForm, question: e.target.value })}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                  {language === 'en' ? 'Answer' : 'উত্তর'}
                </label>
                <textarea
                  rows={4}
                  value={qnaForm.answer}
                  onChange={(e) => setQnaForm({ ...qnaForm, answer: e.target.value })}
                  className="w-full bg-background border border-surface-hover rounded-xl p-3 text-[13px] text-foreground focus:outline-none focus:border-primary font-sans"
                  placeholder={language === 'en' ? 'Enter the answer for AI to use...' : 'এআই যা উত্তর দেবে তা স্পষ্ট করে লিখুন...'}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-surface-hover pt-3">
              <button
                onClick={() => setIsQnaModalOpen(false)}
                className="px-4 py-2 bg-muted text-muted-foreground hover:text-foreground rounded-xl text-[12px] font-bold"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                onClick={handleSaveQna}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90"
              >
                {language === 'en' ? 'Save Q&A' : 'সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
