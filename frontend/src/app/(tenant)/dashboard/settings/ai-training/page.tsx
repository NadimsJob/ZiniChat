'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { Bot, Key, Save, AlertCircle, RefreshCw, MessageSquare, Plus, Edit2, Trash2, X, Check, Wand2 } from 'lucide-react';

export default function AiTrainingPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'api' | 'default' | 'custom'>('default');
  
  // Config state
  const [config, setConfig] = useState<any>({
    routingMode: 'system_only',
    hasCustomKey: false,
    allowByok: false,
    planName: '',
    aiQuota: 0,
    isActive: true,
    replyWhenAssigned: false
  });
  const [apiKey, setApiKey] = useState('');
  
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
      
      const [configRes, qnaRes, docsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents`, { headers })
      ]);
      
      if (configRes.ok) setConfig(await configRes.json());
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

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const body: any = { 
        routingMode: config.routingMode,
        aiOrderEnabled: config.aiOrderEnabled,
        isActive: config.isActive,
        replyWhenAssigned: config.replyWhenAssigned
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
      const url = qnaForm.id 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna/${qnaForm.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna`;
      const method = qnaForm.id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: qnaForm.question, answer: qnaForm.answer })
      });
      
      if (res.ok) {
        setIsQnaModalOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQna = async (id: string) => {
    if (!confirm(language === 'en' ? 'Delete this question?' : 'এই প্রশ্নটি মুছে ফেলবেন?')) return;
    try {
      const token = Cookies.get('access_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const openQnaModal = (qna?: any) => {
    if (qna) {
      setQnaForm({ id: qna.id, question: qna.question, answer: qna.answer || '', isDefault: qna.isDefault });
    } else {
      setQnaForm({ id: '', question: '', answer: '', isDefault: false });
    }
    setIsQnaModalOpen(true);
  };

  const defaultQnas = qnas.filter(q => q.isDefault);
  const customQnas = qnas.filter(q => !q.isDefault);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="bg-white/70 dark:bg-[#0f0f11]/80 backdrop-blur-xl border border-white/50 dark:border-zinc-800/80 rounded-2xl p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{language === 'en' ? 'AI Training & Configuration' : 'এআই ট্রেইনিং ও কনফিগারেশন'}</h1>
        <p className="text-zinc-400 mt-2">{language === 'en' ? 'Train your AI assistant with business-specific knowledge and manage API settings.' : 'আপনার ব্যবসার তথ্য দিয়ে AI কে ট্রেইন করুন এবং API সেটিংস পরিচালনা করুন।'}</p>
      </div>

      {/* Master Toggle */}
      <div className="bg-surface border border-primary/10 shadow-sm rounded-xl p-4 flex flex-col gap-4 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'}`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Enable AI Agent' : 'এআই এজেন্ট চালু করুন'}
              </h2>
              <p className="text-[13px] text-zinc-500">
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

        {config.isActive && (
          <div className="pt-3 border-t border-surface-hover flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div>
              <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">
                {language === 'en' ? 'Reply when assigned to human?' : 'হিউম্যান এজেন্টের কাছে অ্যাসাইন করা থাকলে রিপ্লাই দিবে?'}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {language === 'en' ? 'If checked, AI will continue chatting even when a human agent takes over.' : 'চেক করা থাকলে, হিউম্যান এজেন্ট রিপ্লাই করার সময়ও এআই চ্যাট করবে।'}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.replyWhenAssigned ?? false}
                onChange={(e) => {
                  const val = e.target.checked;
                  setConfig({ ...config, replyWhenAssigned: val });
                  handleQuickSave({ replyWhenAssigned: val });
                }}
                className="w-5 h-5 text-primary rounded border-zinc-600 focus:ring-primary focus:ring-offset-0 bg-background" 
              />
            </label>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-hover mb-3">
        <button 
          onClick={() => setActiveTab('default')}
          className={`px-1.5 py-1 font-medium text-[13px] border-b-2 transition-colors ${activeTab === 'default' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Business Info' : 'ব্যবসার তথ্য'}
        </button>
        <button 
          onClick={() => setActiveTab('custom')}
          className={`px-1.5 py-1 font-medium text-[13px] border-b-2 transition-colors ${activeTab === 'custom' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'Custom Prompt & Docs' : 'কাস্টম প্রম্পট ও ফাইল'}
        </button>
        <button 
          onClick={() => setActiveTab('api')}
          className={`px-1.5 py-1 font-medium text-[13px] border-b-2 transition-colors ${activeTab === 'api' ? 'border-primary text-primary' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
        >
          {language === 'en' ? 'API Settings' : 'API সেটিংস'}
        </button>
      </div>

      {/* Section 1: API Routing Settings */}
      {activeTab === 'api' && (
      <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl p-1.5 animate-in fade-in duration-300">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-primary" /> 
          {language === 'en' ? 'AI Usage & API Settings' : 'এআই ব্যবহার ও API সেটিংস'}
        </h2>

        <div className="bg-background rounded-xl p-1.5 mb-3 flex items-center justify-between border border-surface-hover">
          <div>
            <div className="text-[13px] text-zinc-400">{language === 'en' ? 'Current Plan' : 'বর্তমান প্যাকেজ'}</div>
            <div className="font-bold text-[13px]">{config.planName}</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] text-zinc-400">{language === 'en' ? 'Platform AI Quota' : 'প্ল্যাটফর্ম এআই কোটা'}</div>
            <div className="font-bold text-[13px] text-primary">{config.aiQuota.toLocaleString()} {language === 'en' ? 'msgs/mo' : 'মেসেজ/মাস'}</div>
          </div>
        </div>

        {config.allowByok ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium mb-1.5 text-zinc-300">
                {language === 'en' ? 'API Routing Mode' : 'API রাউটিং মোড'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                <label className={`flex flex-col p-1.5 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'system_only' ? 'border-primary bg-primary/5' : 'border-surface-hover bg-background hover:border-zinc-500'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="radio" name="routing" value="system_only" checked={config.routingMode === 'system_only'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-zinc-600" />
                    <span className="font-bold text-[13px]">System Quota Only</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">Uses platform quota. Stops if quota is exceeded.</span>
                </label>
                
                <label className={`flex flex-col p-1.5 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'custom_only' ? 'border-primary bg-primary/5' : 'border-surface-hover bg-background hover:border-zinc-500'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="radio" name="routing" value="custom_only" checked={config.routingMode === 'custom_only'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-zinc-600" />
                    <span className="font-bold text-[13px]">Custom API Key Only</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">Uses your OpenAI key. Saves platform quota.</span>
                </label>

                <label className={`flex flex-col p-1.5 rounded-xl border-2 cursor-pointer transition-colors ${config.routingMode === 'hybrid' ? 'border-primary bg-primary/5' : 'border-surface-hover bg-background hover:border-zinc-500'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="radio" name="routing" value="hybrid" checked={config.routingMode === 'hybrid'} onChange={e => setConfig({...config, routingMode: e.target.value})} className="text-primary focus:ring-primary bg-background border-zinc-600" />
                    <span className="font-bold text-[13px]">Hybrid (Both)</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">Uses quota first. Switches to custom key if quota runs out.</span>
                </label>
              </div>
            </div>

            {(config.routingMode === 'custom_only' || config.routingMode === 'hybrid') && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-[13px] font-medium mb-1 text-zinc-300">
                  OpenAI API Key
                </label>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    placeholder={config.hasCustomKey ? '•••••••••••••••• (Key saved)' : 'sk-...'}
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)} 
                    className="flex-1 bg-background border border-surface-hover rounded-lg px-1.5 py-2 focus:border-primary focus:outline-none" 
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Your key is securely stored. Leave blank if you don't want to change the currently saved key.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-surface-hover">
              <label className="flex items-start gap-1.5 p-1.5 rounded-xl border border-surface-hover bg-background cursor-pointer hover:border-primary/50 transition-colors">
                <div className="pt-0.5">
                  <input type="checkbox" checked={config.aiOrderEnabled ?? true} onChange={e => setConfig({...config, aiOrderEnabled: e.target.checked})} className="w-5 h-5 text-primary rounded border-zinc-600 focus:ring-primary focus:ring-offset-0 bg-background" />
                </div>
                <div>
                  <div className="font-bold text-[13px] text-zinc-200">
                    {language === 'en' ? 'Allow AI to create orders automatically' : 'AI-কে অটোমেটিক অর্ডার কাটার পারমিশন দিন'}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {language === 'en' 
                      ? 'If enabled, the AI will understand purchase intent and automatically create an order in the Orders tab after asking the customer for confirmation.' 
                      : 'এটি চালু থাকলে, কাস্টমার কিছু কিনতে চাইলে AI নিজে থেকেই অর্ডার কনফার্ম করে Orders পেজে সেভ করে দিবে।'}
                  </div>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={handleSaveConfig} 
                disabled={saving}
                className="flex items-center gap-2 px-1.5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {language === 'en' ? 'Save Settings' : 'সেটিংস সেভ করুন'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-1.5 flex items-start gap-1.5">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-primary">{language === 'en' ? 'BYOK Not Supported' : 'BYOK সাপোর্ট করে না'}</h4>
              <p className="text-[13px] text-zinc-400 mt-1">
                {language === 'en' ? 'Your current plan does not allow Bring Your Own Key (BYOK). The AI will strictly use the platform quota.' : 'আপনার বর্তমান প্যাকেজে নিজস্ব API Key ব্যবহার করার সুবিধা নেই। AI শুধু প্ল্যাটফর্মের কোটা ব্যবহার করবে।'}
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Section 2: Default Q&A */}
      {activeTab === 'default' && (
      <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl p-1.5 animate-in fade-in duration-300">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-secondary" /> 
          {language === 'en' ? 'Business Information' : 'ব্যবসার তথ্য'}
        </h2>
        <p className="text-[13px] text-zinc-400 mb-6">
          {language === 'en' ? 'Answer these standard questions so the AI knows how to reply to your customers.' : 'এই সাধারণ প্রশ্নগুলোর উত্তর দিয়ে দিন, যাতে AI বুঝতে পারে কাস্টমারকে কী রিপ্লাই দিতে হবে।'}
        </p>

        <div className="space-y-2">
          {defaultQnas.map(qna => (
            <div key={qna.id} className="bg-background border border-surface-hover rounded-xl p-1.5 flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-zinc-200">{qna.question}</div>
                {qna.answer ? (
                  <div className="text-[13px] text-zinc-400 mt-2 bg-surface p-1.5 rounded-lg border border-surface-hover">{qna.answer}</div>
                ) : (
                  <div className="text-[13px] text-red-400 mt-2 italic">{language === 'en' ? 'Not answered yet' : 'এখনও উত্তর দেওয়া হয়নি'}</div>
                )}
              </div>
              <button 
                onClick={() => openQnaModal(qna)}
                className="px-1.5 py-1.5 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors text-[13px] font-medium shrink-0 flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> {language === 'en' ? (qna.answer ? 'Edit' : 'Answer') : (qna.answer ? 'এডিট' : 'উত্তর দিন')}
              </button>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Section 3: Custom Prompt & Docs */}
      {activeTab === 'custom' && (
      <div className="space-y-3 animate-in fade-in duration-300">
        <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl p-1.5">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-[13px] font-bold flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" /> 
                {language === 'en' ? 'Custom Prompt (AI Persona)' : 'কাস্টম প্রম্পট (AI এর চরিত্র)'}
              </h2>
              <p className="text-[13px] text-zinc-400 mt-1">
                {language === 'en' ? 'Define exactly how the AI should behave, talk, and reply to customers.' : 'AI ঠিক কীভাবে কথা বলবে এবং কাস্টমারকে কীভাবে রিপ্লাই দেবে, তার বিস্তারিত নিয়মাবলি এখানে লিখে দিন।'}
              </p>
            </div>
            <button 
              onClick={async () => {
                try {
                  const token = Cookies.get('access_token');
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/generate-sample-prompt`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setConfig({...config, systemPrompt: data.prompt});
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
              className="px-1.5 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors text-[13px] font-medium shrink-0 flex items-center gap-2"
            >
              <Wand2 className="w-3.5 h-3.5" /> {language === 'en' ? 'Generate Sample Prompt' : 'স্যাম্পল প্রম্পট তৈরি করুন'}
            </button>
          </div>

          <textarea 
            rows={10} 
            value={config.systemPrompt || ''}
            onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
            placeholder={language === 'en' ? 'Enter system instructions here...' : 'এখানে AI এর জন্য নিয়মাবলি লিখুন...'}
            className="w-full bg-background border border-surface-hover rounded-xl px-1.5 py-1 focus:border-purple-500 focus:outline-none text-[13px] text-zinc-300 leading-relaxed font-mono" 
          />

          <div className="mt-4 flex justify-end">
            <button 
              onClick={async () => {
                setSaving(true);
                try {
                  const token = Cookies.get('access_token');
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/prompt`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ systemPrompt: config.systemPrompt })
                  });
                  alert(language === 'en' ? 'Prompt saved!' : 'প্রম্পট সেভ হয়েছে!');
                } catch(err) { console.error(err); }
                setSaving(false);
              }}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {language === 'en' ? 'Save Prompt' : 'সেভ করুন'}
            </button>
          </div>
        </div>

        {/* Document Upload Area */}
        <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl p-1.5">
           <h2 className="text-[13px] font-bold flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-blue-500" /> 
              {language === 'en' ? 'Knowledge Documents' : 'নলেজ ডকুমেন্টস'}
            </h2>
            <p className="text-[13px] text-zinc-400 mb-4">
              {language === 'en' ? 'Upload up to 2 files (PDF, DOCX, TXT, IMG). Max size: 1MB each.' : 'সর্বোচ্চ ২টি ফাইল আপলোড করতে পারবেন (PDF, DOCX, TXT, IMG)। সাইজ লিমিট: ১ এমবি।'}
            </p>
            <div className="space-y-4">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between bg-background border border-surface-hover p-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <span className="text-blue-500 font-bold text-[11px] uppercase">{doc.filename.split('.').pop()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-[13px] text-zinc-200">{doc.filename}</div>
                          <div className="text-[11px] text-zinc-500 capitalize">{doc.status}</div>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          if(!confirm(language === 'en' ? 'Delete this document?' : 'এই ডকুমেন্টটি মুছে ফেলবেন?')) return;
                          try {
                            const token = Cookies.get('access_token');
                            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents/${doc.id}`, {
                              method: 'DELETE',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            fetchData();
                          } catch(err) { console.error(err); }
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2.5 text-zinc-500 border border-dashed border-surface-hover rounded-xl bg-background/50">
                  {language === 'en' ? 'No documents uploaded yet.' : 'এখনও কোনো ডকুমেন্ট আপলোড করা হয়নি।'}
                </div>
              )}

              <div>
                <label className="relative flex justify-center w-full cursor-pointer appearance-none items-center rounded-xl border-2 border-dashed border-surface-hover bg-background/50 p-1.5 transition-all hover:border-blue-500">
                  <div className="space-y-1 text-center">
                    <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                      {uploadingDoc ? <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" /> : <Plus className="w-5 h-5 text-blue-500" />}
                    </div>
                    <div className="text-[13px] text-zinc-400 font-medium">
                      {uploadingDoc 
                        ? (language === 'en' ? 'Uploading & Processing...' : 'আপলোড হচ্ছে...')
                        : (documents.length >= 2 
                            ? (language === 'en' ? 'Upload limit reached (Max 2)' : 'আপলোড লিমিট শেষ (সর্বোচ্চ ২টি)')
                            : (language === 'en' ? 'Click to upload a document' : 'ডকুমেন্ট আপলোড করতে ক্লিক করুন')
                          )
                      }
                    </div>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    disabled={uploadingDoc || documents.length >= 2}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Check file size (1MB max)
                      if (file.size > 1024 * 1024) {
                        alert(language === 'en' ? 'File must be under 1MB' : 'ফাইলের সাইজ ১ এমবির কম হতে হবে');
                        e.target.value = '';
                        return;
                      }

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
                        
                        if (!res.ok) {
                          const errData = await res.json();
                          throw new Error(errData.message || 'Upload failed');
                        }
                        
                        alert(language === 'en' ? 'Document uploaded & processed!' : 'ডকুমেন্ট আপলোড ও প্রসেস হয়েছে!');
                        fetchData();
                      } catch(err: any) {
                        alert(err.message || 'Error uploading file');
                        console.error(err);
                      } finally {
                        setUploadingDoc(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
        </div>
      </div>
      )}

      {/* QnA Modal */}
      {isQnaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl border border-surface-hover p-1.5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{qnaForm.id ? (language === 'en' ? 'Edit Q&A' : 'এডিট করুন') : (language === 'en' ? 'New Q&A' : 'নতুন প্রশ্ন যোগ করুন')}</h3>
              <button onClick={() => setIsQnaModalOpen(false)} className="text-zinc-400 hover:text-zinc-200 p-1"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-1 text-zinc-400">
                  {language === 'en' ? 'Question / Topic' : 'প্রশ্ন / বিষয়'}
                </label>
                <input 
                  type="text" 
                  value={qnaForm.question} 
                  onChange={e => setQnaForm({...qnaForm, question: e.target.value})} 
                  disabled={qnaForm.isDefault}
                  className="w-full bg-background border border-surface-hover rounded-lg px-1.5 py-2 focus:border-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" 
                  placeholder={language === 'en' ? 'e.g. Do you deliver outside Dhaka?' : 'যেমন: আপনারা কি ঢাকার বাইরে ডেলিভারি দেন?'}
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium mb-1 text-zinc-400">
                  {language === 'en' ? 'Answer / Instructions for AI' : 'উত্তর / AI এর জন্য নির্দেশনা'}
                </label>
                <textarea 
                  rows={4} 
                  value={qnaForm.answer} 
                  onChange={e => setQnaForm({...qnaForm, answer: e.target.value})} 
                  className="w-full bg-background border border-surface-hover rounded-lg px-1.5 py-2 focus:border-primary focus:outline-none" 
                  placeholder={language === 'en' ? 'Yes, we deliver outside Dhaka via Pathao Courier. It takes 2-3 days.' : 'হ্যাঁ, আমরা পাঠাও কুরিয়ারের মাধ্যমে ঢাকার বাইরে ডেলিভারি দেই। সময় লাগে ২-৩ দিন।'}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-1.5">
              <button onClick={() => setIsQnaModalOpen(false)} className="px-1.5 py-2 rounded-lg font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button onClick={handleSaveQna} className="flex items-center gap-2 px-1.5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                <Check className="w-3.5 h-3.5" /> {language === 'en' ? 'Save' : 'সেভ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
