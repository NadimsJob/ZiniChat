'use client';

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { useFeature } from '@/hooks/useFeature';
import { 
  Bot, Key, Save, AlertCircle, RefreshCw, MessageSquare, Plus, Edit2, 
  Trash2, X, Check, Wand2, Eye, Lock, Sliders, Sparkles, ShieldCheck, 
  FileText, AlertTriangle, Send, PlayCircle, HelpCircle, User, CornerDownLeft, Tag
} from 'lucide-react';
import InstructionBanner from '@/components/InstructionBanner';
import LabelForm from '@/components/labels/LabelForm';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const MAX_PROMPT_LENGTH = 2000;
const MAX_QUESTION_LENGTH = 100;
const MAX_ANSWER_LENGTH = 300;

export default function AiTrainingPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'default' | 'custom' | 'api'>('default');
  
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
    agentName: '',
    systemPrompt: ''
  });
  const [apiKey, setApiKey] = useState('');
  
  // Event-wise AI Tools state
  const [tools, setTools] = useState<Record<string, { isEnabled: boolean; configJson: any }>>({
    order_placement: { isEnabled: true, configJson: { requireExplicitConfirmation: true } },
    image_reading: { isEnabled: true, configJson: {} },
    support_detection: { isEnabled: false, configJson: { reasonCategories: ['general', 'complaint', 'refund_return', 'delivery_issue'] } },
    product_matching: { isEnabled: false, configJson: { minMatchConfidence: 0.6 } }
  });

  // Q&A state
  const [qnas, setQnas] = useState<any[]>([]);
  const [isQnaModalOpen, setIsQnaModalOpen] = useState(false);
  const [qnaForm, setQnaForm] = useState({ id: '', question: '', answer: '', isDefault: false });

  // Document state
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Tags state
  const [labels, setLabels] = useState<any[]>([]);
  const [isLabelFormOpen, setIsLabelFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<any>(null);

  // Live Simulator State
  const [simulatorMessages, setSimulatorMessages] = useState<Array<{ id: string; sender: 'user' | 'ai'; text: string }>>([
    {
      id: '1',
      sender: 'ai',
      text: language === 'en' 
        ? 'Hello! I am your AI assistant simulator. Ask me any question to test my prompt and Q&A knowledge!' 
        : 'হ্যালো! আমি আপনার এআই টেস্ট সিমুলেটর। প্রম্পট ও ক্যানাল নলেজ পরীক্ষা করতে যেকোনো প্রশ্ন লিখুন!'
    }
  ]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [configRes, toolsRes, qnaRes, docsRes, labelsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/tools`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/qna`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/documents`, { headers }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/labels`, { headers })
      ]);
      
      if (configRes.ok) setConfig(await configRes.json());
      if (toolsRes.ok) {
        const toolsList = await toolsRes.json();
        const map: Record<string, { isEnabled: boolean; configJson: any }> = {};
        (toolsList || []).forEach((t: any) => {
          map[t.toolType] = { isEnabled: t.isEnabled, configJson: t.configJson || {} };
        });
        setTools(prev => ({ ...prev, ...map }));
      }
      if (qnaRes.ok) setQnas(await qnaRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (labelsRes.ok) setLabels(await labelsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [simulatorMessages, isSimulating]);

  const handleStartAiPageTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { 
          element: '#tour-persona', 
          popover: { 
            title: language === 'en' ? '🎭 AI Persona & Core Rules' : '🎭 এআই পারসোনা ও মূল নিয়মাবলী', 
            description: language === 'en' 
              ? 'Define your AI\'s persona, agent name, and core instructions here.' 
              : 'এখানে আপনার এআই-এর নাম, ব্যক্তিত্ব এবং ব্যবসার নিয়মাবলী সেট করুন।',
            side: "bottom", 
            align: 'start' 
          } 
        },
        { 
          element: '#tour-faq', 
          popover: { 
            title: language === 'en' ? '📚 Q&A Knowledge Base & Files' : '📚 প্রশ্ন-উত্তর নলেজ বেইস ও ফাইলস', 
            description: language === 'en' 
              ? 'Add common Q&As and upload files. Your AI will strictly follow these facts.' 
              : 'প্রচরাচর জিজ্ঞাসিত প্রশ্ন ও প্রোডাক্ট ক্যাটালগ যোগ করুন। এআই কেবল এই তথ্যের উপর ভিত্তি করে উত্তর দেবে।',
            side: "bottom", 
            align: 'start' 
          } 
        },
        { 
          element: '#tour-tags', 
          popover: { 
            title: language === 'en' ? '🏷️ Smart Event Toggles & Tags' : '🏷️ ইভেন্ট ও স্মার্ট ট্যাগ টগলস', 
            description: language === 'en' 
              ? 'Define how the AI should react to specific customer triggers like order placement & support handover.' 
              : 'অটো অর্ডার প্লেসমেন্ট, ইমেজ রিডিং ও হিউম্যান সাপোর্ট হস্তান্তর কন্ট্রোল করুন।',
            side: "top", 
            align: 'start' 
          } 
        },
        { 
          element: '#tour-simulator', 
          popover: { 
            title: language === 'en' ? '⚡ Live AI Test Simulator' : '⚡ লাইভ এআই টেস্ট সিমুলেটর', 
            description: language === 'en' 
              ? 'Test your AI instantly in this live chat simulator!' 
              : 'আপনার এআই-এর রেসপন্স মেসেজ পাঠিয়ে এখনই এই সিমুলেটরে রিয়েল-টাইমে টেস্ট করুন!',
            side: "left", 
            align: 'start' 
          } 
        }
      ]
    });
    driverObj.drive();
  };

  const handleToggleTool = async (toolType: string, newEnabled: boolean, configJson?: any) => {
    const targetConfig = configJson !== undefined ? configJson : tools[toolType]?.configJson;
    setTools(prev => ({
      ...prev,
      [toolType]: { isEnabled: newEnabled, configJson: targetConfig }
    }));

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/tools/${toolType}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: newEnabled, configJson: targetConfig })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to update tool setting');
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle AI tool', err);
      fetchData();
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
        setApiKey('');
        fetchData();
        alert(language === 'en' ? 'Settings saved successfully' : 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save configuration');
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

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/config/byok`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Failed to save changes');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePrompt = async () => {
    if (config.systemPrompt && config.systemPrompt.length > MAX_PROMPT_LENGTH) {
      alert(`System prompt cannot exceed ${MAX_PROMPT_LENGTH.toLocaleString()} characters.`);
      return;
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/prompt`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ systemPrompt: config.systemPrompt })
      });

      if (res.ok) {
        alert(language === 'en' ? 'System prompt saved!' : 'প্রম্পট সেভ হয়েছে!');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to save prompt');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveQna = async () => {
    if (qnaForm.question.length > MAX_QUESTION_LENGTH) {
      alert(`Question cannot exceed ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }
    if (qnaForm.answer.length > MAX_ANSWER_LENGTH) {
      alert(`Answer cannot exceed ${MAX_ANSWER_LENGTH} characters.`);
      return;
    }

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
        alert(Array.isArray(data.message) ? data.message.join('; ') : (data.message || 'Error saving Q&A'));
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

    if (file.size > 500 * 1024) {
      alert(language === 'en' ? 'File size must be 500KB or less' : 'ফাইলের সাইজ অবশ্যই ৫০০KB বা তার কম হতে হবে');
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

  const handleSaveLabel = async (data: { name: string; color: string; aiPrompt?: string; description?: string; isActive?: boolean }, id?: string) => {
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const method = id ? 'PATCH' : 'POST';
      const url = id ? `${API}/labels/${id}` : `${API}/labels`;
      
      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setIsLabelFormOpen(false);
        setEditingLabel(null);
        fetchData();
        toast.success(id ? 'Tag updated' : 'Tag created');
      } else {
        toast.error('Failed to save tag');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving tag');
    }
  };

  const handleDeleteLabel = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this tag?' : 'আপনি কি নিশ্চিত যে এই ট্যাগটি মুছে ফেলতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/labels/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
        toast.success(language === 'en' ? 'Tag deleted' : 'ট্যাগ মুছে ফেলা হয়েছে');
      } else {
        toast.error('Failed to delete tag');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error deleting tag');
    }
  };

  const handleToggleLabelActive = async (id: string, currentActive: boolean) => {
    try {
      const token = Cookies.get('access_token');
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/labels/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (res.ok) {
        fetchData();
        toast.success(language === 'en' ? 'Tag status updated' : 'ট্যাগের স্ট্যাটাস আপডেট করা হয়েছে');
      } else {
        toast.error('Failed to update tag status');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating tag status');
    }
  };

  // Load Default System Prompt Handler
  const handleLoadDefaultPrompt = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/generate-sample-prompt`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig((prev: any) => ({ ...prev, systemPrompt: data.prompt }));
        toast.success(language === 'en' ? 'Default Persona Prompt loaded! Click Save to apply.' : 'ডিফল্ট পারসোনা প্রম্পট লোড করা হয়েছে! সেভ বাটনে ক্লিক করুন।');
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'en' ? 'Failed to load default prompt' : 'ডিফল্ট প্রম্পট লোড করতে ব্যর্থ হয়েছে');
    }
  };

  // Simulator Test Message Handler (Real AI API Connection)
  const handleSimulateSend = async (customText?: string) => {
    const textToSend = customText || simulatorInput.trim();
    if (!textToSend || isSimulating) return;

    const userMsg = { id: Date.now().toString(), sender: 'user' as const, text: textToSend };
    setSimulatorMessages(prev => [...prev, userMsg]);
    if (!customText) setSimulatorInput('');
    setIsSimulating(true);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/ai-training/test-simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: textToSend })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.message || (language === 'en' ? 'AI Quota exceeded or server error' : 'এআই রেসপন্স কোটা শেষ অথবা সার্ভার এরর');
        setSimulatorMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai' as const, text: `⚠️ [Error]: ${errMsg}` }]);
      } else {
        const data = await res.json();
        setSimulatorMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai' as const, text: data.reply }]);
      }
    } catch (err: any) {
      setSimulatorMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai' as const,
        text: `⚠️ ${language === 'en' ? 'Failed to connect to AI server.' : 'এআই সার্ভারে যুক্ত হওয়া যায়নি।'}`
      }]);
    } finally {
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const promptLength = config.systemPrompt?.length || 0;
  const promptPercent = (promptLength / MAX_PROMPT_LENGTH) * 100;

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
      descEn: 'AI will detect when a customer needs a human and flag for your team.',
      descBn: 'কাস্টমারের হিউম্যান সহায়তার প্রয়োজন হলে টিমের কাছে টিকিট ফ্ল্যাগ করবে।',
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
    <div className="space-y-4 max-w-[1600px] mx-auto pb-10 text-foreground">
      {/* Top Header with Spotlight Tour Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Bot className="w-6 h-6 text-primary" />
            {language === 'en' ? 'AI Assistant Training & Live Simulator' : 'এআই অ্যাসিস্ট্যান্ট ট্রেইনিং ও লাইভ সিমুলেটর'}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1 font-sans">
            {language === 'en'
              ? 'Configure business rules, persona, knowledge base, and test responses in real-time.'
              : 'আপনার ব্যবসার নীতি, এআই ব্যক্তিত্ব, নলেজ বেইস কনফিগার করুন এবং রিয়েল-টাইমে টেস্ট করুন।'}
          </p>
        </div>

        <button
          onClick={handleStartAiPageTour}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          {language === 'en' ? 'Start Product Tour' : 'ট্যুর শুরু করুন'}
        </button>
      </div>

      <InstructionBanner
        title={language === 'en' ? 'How to Train Your AI Agent' : 'কীভাবে আপনার এআই এজেন্টকে ট্রেইন করবেন'}
        description={
          language === 'en'
            ? '1. Fill out Persona & Core Rules so AI represents your brand accurately. 2. Fill out Business Info Q&A so AI knows your delivery policy, timing & store location. 3. Use the Live Simulator on the right to test responses instantly!'
            : '১. পারসোনা ফিল্ডে আপনার ব্র‍্যান্ডের নিয়মাবলী লিখুন। ২. ব্যবসার সময়সূচী, ডেলিভারি চার্জ ও ঠিকানা জানাতে Q&A সেকশন পূরণ করুন। ৩. ডানপাশের লাইভ সিমুলেটরে মেসেজ পাঠিয়ে তৎক্ষনাৎ উত্তর টেস্ট করুন!'
        }
      />

      {/* Main Split-Screen Grid: Left Setup vs Right Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Guided Setup Sections (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 1: Master Toggle & Persona (#tour-persona) */}
          <div id="tour-persona" className="bg-card border border-border shadow-md rounded-2xl p-4 space-y-4 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${config.isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm">
                    {language === 'en' ? 'Enable AI Agent' : 'এআই এজেন্ট চালু করুন'}
                  </h2>
                  <p className="text-[12px] text-muted-foreground font-sans">
                    {language === 'en' ? 'Turn this off to pause AI responses.' : 'এআই রিপ্লাই বন্ধ রাখতে অফ করুন।'}
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
            <div className="pt-3 border-t border-border">
              <label className="block text-[12px] font-bold text-foreground mb-1">
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

            {/* Persona & System Prompt */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" />
                  {language === 'en' ? 'Persona Instructions & Rules' : 'পারসোনা নির্দেশাবলী ও নীতিসমূহ'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadDefaultPrompt}
                    className="text-[11px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title={language === 'en' ? 'Load default behavior & anti-hallucination rules' : 'ডিফল্ট আচরণ ও নিয়মাবলী লোড করুন'}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{language === 'en' ? 'Load Default' : 'ডিফল্ট প্রম্পট'}</span>
                  </button>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {promptLength.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
              <textarea
                rows={5}
                maxLength={MAX_PROMPT_LENGTH}
                value={config.systemPrompt || ''}
                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                className="w-full bg-background border border-border rounded-xl p-3 text-[13px] text-foreground focus:outline-none font-mono focus:border-primary"
                placeholder={language === 'en' ? 'You are a polite sales assistant for my store. Always greet politely...' : 'আপনি আমার শোরুমের একজন বিনয়ী সাপোর্ট এজেন্ট। কাস্টমারদের সাথে সর্বদা সুন্দরভাবে কথা বলুন...'}
              />
              <div className="flex justify-between items-center pt-1">
                <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${promptPercent > 90 ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(promptPercent, 100)}%` }}
                  />
                </div>
                <button
                  onClick={handleSavePrompt}
                  className="px-4 py-1.5 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Save Prompt' : 'প্রম্পট সেভ করুন'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Knowledge Base Q&As & Documents (#tour-faq) */}
          <div id="tour-faq" className="bg-card border border-border shadow-md rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  {language === 'en' ? 'Business Q&A & Documents' : 'ব্যবসার সাধারণ প্রশ্নোত্তর (Q&A) ও ফাইলস'}
                </h2>
                <p className="text-[12px] text-muted-foreground font-sans">
                  {language === 'en' 
                    ? `AI will strictly follow these facts to answer questions (Max 20 Q&As, current: ${qnas.length}/20).` 
                    : `এআই কেবল এই তথ্যের উপর ভিত্তি করে কাস্টমার প্রশ্নের উত্তর দেবে (সর্বোচ্চ ২০টি প্রশ্নোত্তর, বর্তমান: ${qnas.length}/২০)।`}
                </p>
              </div>
              <button
                onClick={() => {
                  if (qnas.length >= 20) {
                    alert(language === 'en' ? 'Maximum 20 Q&As allowed' : 'সর্বোচ্চ ২০টি প্রশ্নোত্তর যোগ করা যাবে');
                    return;
                  }
                  setQnaForm({ id: '', question: '', answer: '', isDefault: false });
                  setIsQnaModalOpen(true);
                }}
                className="px-3 py-1.5 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                {language === 'en' ? 'Add Q&A' : 'প্রশ্ন যোগ করুন'}
              </button>
            </div>

            {/* Q&A List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {qnas.map((qna) => (
                <div key={qna.id} className="bg-background border border-border rounded-xl p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[13px] text-foreground flex items-center gap-1.5">
                      <span>{qna.question}</span>
                      {qna.isDefault && (
                        <span className="text-[9px] bg-primary/20 text-primary font-bold px-1.5 py-0.2 rounded-full">Default</span>
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
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQna(qna.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[12px] text-foreground bg-card p-2 rounded-lg border border-border/50">
                    {qna.answer ? qna.answer : <span className="text-muted-foreground italic font-sans">{language === 'en' ? 'No answer provided.' : 'উত্তর লেখা হয়নি।'}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Document Upload Subsection (Hidden temporarily) */}
            {false && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    {language === 'en' ? 'Document Files (Max 500KB PDF/Word)' : 'ডকুমেন্ট ফাইলস (সর্বোচ্চ ৫০০KB PDF/Word)'}
                  </h3>
                  {documents.length < 2 && (
                    <label className="px-2.5 py-1 bg-primary/10 text-primary font-bold rounded-lg text-[11px] hover:bg-primary/20 transition-all cursor-pointer flex items-center gap-1">
                      {uploadingDoc ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      {language === 'en' ? 'Upload PDF' : 'পিডিএফ আপলোড'}
                      <input type="file" onChange={handleUploadDoc} className="hidden" accept=".pdf,.docx,.txt" />
                    </label>
                  )}
                </div>

                <div className="space-y-1.5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-background border border-border rounded-xl p-2.5 flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate font-semibold">{doc.filename}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1 text-muted-foreground hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Event-Wise AI Behavior & Smart Tags (#tour-tags) */}
          <div id="tour-tags" className="bg-card border border-border shadow-md rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-primary" />
              <div>
                <h2 className="font-bold text-foreground text-sm">
                  {language === 'en' ? 'Event-Wise AI Behavior & Smart Tags' : 'ইভেন্ট-ভিত্তিক এআই আচরণ ও স্মার্ট ট্যাগস'}
                </h2>
                <p className="text-[12px] text-muted-foreground font-sans">
                  {language === 'en' ? 'Control exactly when and how the AI executes actions.' : 'কাস্টমার মেসেজের নির্দিষ্ট ইভেন্টে এআই অ্যাকশন অন/অফ করুন।'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toolDefinitions.map(tool => {
                const toolState = tools[tool.type] || { isEnabled: false, configJson: {} };
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
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-[12px] text-foreground">
                          {tool.type === 'order_placement' && <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
                          {tool.type === 'image_reading' && <Eye className="w-3.5 h-3.5 text-blue-600" />}
                          {tool.type === 'support_detection' && <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />}
                          {tool.type === 'product_matching' && <Wand2 className="w-3.5 h-3.5 text-purple-600" />}
                          {language === 'en' ? tool.titleEn : tool.titleBn}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-sans">
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
                        <div className={`w-8 h-4.5 bg-zinc-700 peer-focus:outline-none rounded-full peer ${
                          isAllowed ? 'peer-checked:after:translate-x-full peer-checked:bg-primary cursor-pointer' : 'cursor-not-allowed opacity-50'
                        } after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all`}></div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: AI Response Tags / Conversation Tags (#tour-tags-section) */}
          <div id="tour-tags-section" className="bg-card border border-border shadow-md rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Tag className="w-4 h-4 text-primary" />
                  {language === 'en' ? 'Conversation Tags' : 'কনভারসেশন ট্যাগস'}
                </h2>
                <p className="text-[12px] text-muted-foreground font-sans">
                  {language === 'en' 
                    ? `AI automatically matches enabled tags to incoming messages (Max 10 tags, current: ${labels.length}/10).` 
                    : `গ্রাহকের মেসেজের ওপর ভিত্তি করে এআই স্বয়ংক্রিয়ভাবে এই ট্যাগগুলো চ্যাটে অ্যাসাইন করবে (সর্বোচ্চ ১০টি ট্যাগ, বর্তমান: ${labels.length}/১০)।`}
                </p>
              </div>
              {!isLabelFormOpen && (
                <button
                  onClick={() => { 
                    if (labels.length >= 10) {
                      alert(language === 'en' ? 'Maximum 10 tags allowed' : 'সর্বোচ্চ ১০টি ট্যাগ যোগ করা যাবে');
                      return;
                    }
                    setEditingLabel(null); 
                    setIsLabelFormOpen(true); 
                  }}
                  className="px-3 py-1.5 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {language === 'en' ? 'New Tag' : 'নতুন ট্যাগ'}
                </button>
              )}
            </div>

            {isLabelFormOpen && (
              <div className="bg-card border border-border rounded-2xl p-1.5 shadow-sm animate-in zoom-in-95 duration-200">
                <LabelForm 
                  initialData={editingLabel} 
                  onSave={handleSaveLabel} 
                  onCancel={() => { setIsLabelFormOpen(false); setEditingLabel(null); }} 
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {labels.length === 0 ? (
                <div className="col-span-full py-8 text-center bg-background/50 border border-border rounded-xl">
                  <Tag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs font-semibold">
                    {language === 'en' ? 'No tags created yet.' : 'এখনো কোনো ট্যাগ তৈরি করা হয়নি।'}
                  </p>
                </div>
              ) : (
                labels.map((label: any) => (
                  <div key={label.id} className="bg-background border border-border p-3.5 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: label.color }} />
                    <div className="pl-2 space-y-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border min-w-0 truncate flex-1"
                          style={{ backgroundColor: `${label.color}15`, color: label.color, borderColor: `${label.color}30` }}>
                          <span className="truncate">{label.name}</span>
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0 ml-auto">
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              checked={label.isActive ?? true}
                              onChange={() => handleToggleLabelActive(label.id, label.isActive ?? true)}
                              className="sr-only peer" 
                            />
                            <div className="w-8 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                          </label>

                          <button 
                            onClick={() => { setEditingLabel(label); setIsLabelFormOpen(true); }} 
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-lg hover:bg-muted/50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteLabel(label.id)} 
                            className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {label.description && (
                        <p className="text-[11px] text-muted-foreground font-sans line-clamp-1">{label.description}</p>
                      )}

                      {label.aiPrompt && (
                        <div className="bg-card p-2 rounded-lg border border-border/50 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <Wand2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <p className="line-clamp-2" title={label.aiPrompt}>{label.aiPrompt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Simulator (#tour-simulator) (5 Cols on desktop, Sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div id="tour-simulator" className="bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col h-[460px] max-h-[75vh]">
            
            {/* Simulator Header */}
            <div className="p-3.5 border-b border-border bg-surface/80 backdrop-blur-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    {config.agentName || 'ZiniChat Assistant'}
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">Live Simulator</span>
                  </h3>
                  <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                    <span>⚡</span>
                    <span>{language === 'en' ? '1 AI Response credit per test' : '১টি এআই রেসপন্স ক্রেডিট কাটা হবে'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSimulatorMessages([{
                  id: '1',
                  sender: 'ai',
                  text: language === 'en' ? 'Simulator reset! Send a message.' : 'সিমুলেটর রিসেট হয়েছে! যেকোনো মেসেজ পাঠান।'
                }])}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                title={language === 'en' ? 'Clear Chat' : 'চ্যাট ক্লিয়ার করুন'}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Simulator Messages Feed */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50 custom-scrollbar">
              {simulatorMessages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/30">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[82%] p-3 rounded-2xl text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-xs shadow-sm font-sans'
                      : 'bg-card text-foreground border border-border/80 rounded-tl-xs shadow-xs font-sans'
                  }`}>
                    {msg.text}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-zinc-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {isSimulating && (
                <div className="flex gap-2 justify-start items-center">
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30">
                    <Bot className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <div className="bg-card text-muted-foreground border border-border p-2.5 rounded-2xl text-[12px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
                    {language === 'en' ? 'AI is thinking...' : 'এআই উত্তর টাইপ করছে...'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Test Prompt Pills */}
            <div className="px-3 py-2 border-t border-border bg-card/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-muted-foreground shrink-0">Test Prompts:</span>
              {[
                { labelEn: 'Delivery Fee?', labelBn: 'ডেলিভারি চার্জ কত?', text: 'ডেলিভারি চার্জ কত?' },
                { labelEn: 'Location?', labelBn: 'ঠিকানা কোথায়?', text: 'আপনাদের শোরুমের ঠিকানা কোথায়?' },
                { labelEn: 'How to Order?', labelBn: 'কীভাবে অর্ডার করব?', text: 'আমি কীভাবে অর্ডার করব?' }
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSimulateSend(pill.text)}
                  className="px-2.5 py-1 bg-surface-hover/80 hover:bg-primary/20 hover:text-primary text-[10.5px] font-medium text-foreground rounded-full border border-border transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {language === 'en' ? pill.labelEn : pill.labelBn}
                </button>
              ))}
            </div>

            {/* Input Box */}
            <div className="p-3 border-t border-border bg-card">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSimulateSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={simulatorInput}
                  onChange={(e) => setSimulatorInput(e.target.value)}
                  placeholder={language === 'en' ? 'Type a test query (e.g. Delivery Charge)...' : 'টেস্ট প্রশ্ন লিখুন (যেমন: ডেলিভারি চার্জ কত)...'}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-[12.5px] text-foreground focus:outline-none focus:border-primary font-sans"
                />
                <button
                  type="submit"
                  disabled={!simulatorInput.trim() || isSimulating}
                  className="p-2 bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>

      </div>

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
              <button onClick={() => setIsQnaModalOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[12px] font-medium text-muted-foreground">
                    {language === 'en' ? 'Question' : 'প্রশ্ন'}
                  </label>
                  <span className={`text-[10px] ${qnaForm.question.length > MAX_QUESTION_LENGTH * 0.9 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                    {qnaForm.question.length} / {MAX_QUESTION_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={MAX_QUESTION_LENGTH}
                  value={qnaForm.question}
                  onChange={(e) => setQnaForm({ ...qnaForm, question: e.target.value })}
                  className="w-full bg-background border border-surface-hover rounded-xl px-3 py-2 text-[13px] text-foreground focus:outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[12px] font-medium text-muted-foreground">
                    {language === 'en' ? 'Answer' : 'উত্তর'}
                  </label>
                  <span className={`text-[10px] ${qnaForm.answer.length > MAX_ANSWER_LENGTH * 0.9 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                    {qnaForm.answer.length} / {MAX_ANSWER_LENGTH}
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={MAX_ANSWER_LENGTH}
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
                className="px-4 py-2 bg-muted text-muted-foreground hover:text-foreground rounded-xl text-[12px] font-bold cursor-pointer"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                onClick={handleSaveQna}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-[12px] hover:bg-primary/90 cursor-pointer"
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
