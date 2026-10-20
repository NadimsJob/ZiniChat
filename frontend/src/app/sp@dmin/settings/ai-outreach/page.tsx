'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { toast, Toaster } from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import {
  Mail,
  Bot,
  ShieldAlert,
  Key,
  Sliders,
  Trash2,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Flame,
  Search,
  Check,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SuppressionItem {
  id: string;
  email: string;
  reason: string;
  tenantId: string | null;
  createdAt: string;
}

export default function SpadminAiOutreachPage() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSerp, setTestingSerp] = useState(false);
  const [serpTestResult, setSerpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kill Switch Modal State
  const [killSwitchModalOpen, setKillSwitchModalOpen] = useState(false);
  const [killSwitchReason, setKillSwitchReason] = useState('');
  const [togglingKillSwitch, setTogglingKillSwitch] = useState(false);

  // Suppression State
  const [suppressions, setSuppressions] = useState<SuppressionItem[]>([]);
  const [suppressionTotal, setSuppressionTotal] = useState(0);
  const [suppressionPage, setSuppressionPage] = useState(1);
  const [suppressionLimit] = useState(10);
  const [newSuppressionEmail, setNewSuppressionEmail] = useState('');
  const [newSuppressionReason, setNewSuppressionReason] = useState('admin_blocked');
  const [addingSuppression, setAddingSuppression] = useState(false);

  // Connected Superadmin AI Models
  const [connectedAiConfigs, setConnectedAiConfigs] = useState<any[]>([]);
  const [selectedVisionConfigId, setSelectedVisionConfigId] = useState<string>('custom');
  const [selectedDraftConfigId, setSelectedDraftConfigId] = useState<string>('custom');

  // Form State
  const [showSerpKey, setShowSerpKey] = useState(false);
  const [form, setForm] = useState({
    serpApiKey: '',
    hasExistingSerpKey: false,
    serpApiProvider: 'serper',
    visionAiProvider: 'gemini',
    visionAiModel: 'gemini-1.5-flash',
    draftAiProvider: 'gemini',
    draftAiModel: 'gemini-1.5-flash',
    masterVisionPrompt: '',
    masterDraftPrompt: '',
    isEmergencyPaused: false,
    emergencyPausedReason: '',
    emergencyPausedAt: '',
    minThrottleIntervalSec: 45,
    dailyMaxEmailsPerTenant: 200,
    visionCreditCost: 1,
    draftCreditCost: 1,
  });

  const fetchConfig = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/spadmin/ai-outreach`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load global outreach settings');
      const data = await res.json();

      let configs: any[] = [];
      if (Array.isArray(data.connectedAiConfigs) && data.connectedAiConfigs.length > 0) {
        configs = data.connectedAiConfigs;
        setConnectedAiConfigs(configs);
      } else {
        try {
          const aiRes = await fetch(`${API}/ai-config`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (aiRes.ok) {
            const aiData = await aiRes.json();
            if (Array.isArray(aiData)) {
              configs = aiData;
              setConnectedAiConfigs(aiData);
            }
          }
        } catch (e) {}
      }

      const activeVision = configs.find(
        (c: any) => c.provider?.toLowerCase() === (data.visionAiProvider || 'gemini').toLowerCase() && 
             c.modelName?.toLowerCase() === (data.visionAiModel || 'gemini-1.5-flash').toLowerCase()
      );
      setSelectedVisionConfigId(activeVision ? activeVision.id : 'custom');

      const activeDraft = configs.find(
        (c: any) => c.provider?.toLowerCase() === (data.draftAiProvider || 'gemini').toLowerCase() && 
             c.modelName?.toLowerCase() === (data.draftAiModel || 'gemini-1.5-flash').toLowerCase()
      );
      setSelectedDraftConfigId(activeDraft ? activeDraft.id : 'custom');

      setForm({
        serpApiKey: '',
        hasExistingSerpKey: !!data.hasSerpApiKey,
        serpApiProvider: data.serpApiProvider || 'serper',
        visionAiProvider: data.visionAiProvider || 'gemini',
        visionAiModel: data.visionAiModel || 'gemini-1.5-flash',
        draftAiProvider: data.draftAiProvider || 'gemini',
        draftAiModel: data.draftAiModel || 'gemini-1.5-flash',
        masterVisionPrompt: data.masterVisionPrompt || '',
        masterDraftPrompt: data.masterDraftPrompt || '',
        isEmergencyPaused: !!data.isEmergencyPaused,
        emergencyPausedReason: data.emergencyPausedReason || '',
        emergencyPausedAt: data.emergencyPausedAt || '',
        minThrottleIntervalSec: data.minThrottleIntervalSec ?? 45,
        dailyMaxEmailsPerTenant: data.dailyMaxEmailsPerTenant ?? 200,
        visionCreditCost: data.visionCreditCost ?? 1,
        draftCreditCost: data.draftCreditCost ?? 1,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error loading outreach configuration');
    }
  };

  const fetchSuppressions = async (page = 1) => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/spadmin/ai-outreach/suppressions?page=${page}&limit=${suppressionLimit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSuppressions(data.items || []);
        setSuppressionTotal(data.total || 0);
        setSuppressionPage(page);
      }
    } catch (err) {
      console.error('Failed to load suppressions', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchConfig(), fetchSuppressions(1)]).finally(() => setLoading(false));
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = Cookies.get('access_token');
      const payload: any = {
        serpApiProvider: form.serpApiProvider,
        visionAiProvider: form.visionAiProvider,
        visionAiModel: form.visionAiModel,
        draftAiProvider: form.draftAiProvider,
        draftAiModel: form.draftAiModel,
        masterVisionPrompt: form.masterVisionPrompt,
        masterDraftPrompt: form.masterDraftPrompt,
        minThrottleIntervalSec: Number(form.minThrottleIntervalSec),
        dailyMaxEmailsPerTenant: Number(form.dailyMaxEmailsPerTenant),
        visionCreditCost: Number(form.visionCreditCost),
        draftCreditCost: Number(form.draftCreditCost),
      };

      if (form.serpApiKey.trim()) {
        payload.serpApiKey = form.serpApiKey.trim();
      }

      const res = await fetch(`${API}/spadmin/ai-outreach`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update configuration');
      }

      toast.success(
        language === 'en'
          ? 'AI Outreach configuration saved successfully!'
          : 'এআই আউটরিচ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
      );
      setForm((prev) => ({ ...prev, serpApiKey: '', hasExistingSerpKey: true }));
      setSerpTestResult(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSerp = async () => {
    setTestingSerp(true);
    setSerpTestResult(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/spadmin/ai-outreach/test-serp`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSerpTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      setSerpTestResult({ success: false, message: err.message || 'Connection test failed' });
      toast.error(err.message || 'Connection test failed');
    } finally {
      setTestingSerp(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    setTogglingKillSwitch(true);
    try {
      const token = Cookies.get('access_token');
      const targetState = !form.isEmergencyPaused;
      const res = await fetch(`${API}/spadmin/ai-outreach/kill-switch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isPaused: targetState,
          reason: killSwitchReason || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to toggle emergency kill-switch');
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        isEmergencyPaused: data.isEmergencyPaused,
        emergencyPausedReason: data.emergencyPausedReason,
        emergencyPausedAt: data.emergencyPausedAt,
      }));

      setKillSwitchModalOpen(false);
      setKillSwitchReason('');
      toast.success(
        targetState
          ? (language === 'en' ? 'Master Kill-Switch Activated! All email queues paused.' : 'মাস্টার কিল-সুইচ চালু! সকল আউটরিচ কিউ স্থগিত করা হয়েছে।')
          : (language === 'en' ? 'Master Kill-Switch Deactivated! Queues resumed.' : 'মাস্টার কিল-সুইচ বন্ধ! আউটরিচ কিউ পুনরায় চালু হয়েছে।')
      );
    } catch (err: any) {
      toast.error(err.message || 'Error updating kill-switch');
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppressionEmail.trim()) return;

    setAddingSuppression(true);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/spadmin/ai-outreach/suppressions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newSuppressionEmail.trim(),
          reason: newSuppressionReason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add suppression');
      }

      toast.success(language === 'en' ? 'Suppression added' : 'সাপ্রেশন সফলভাবে যুক্ত হয়েছে');
      setNewSuppressionEmail('');
      fetchSuppressions(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add suppression');
    } finally {
      setAddingSuppression(false);
    }
  };

  const handleDeleteSuppression = async (id: string, email: string) => {
    if (!confirm(language === 'en' ? `Remove ${email} from suppression list?` : `${email} কে সাপ্রেশন লিস্ট থেকে সরাতে চান?`)) {
      return;
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/spadmin/ai-outreach/suppressions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete suppression');
      toast.success(language === 'en' ? 'Suppression removed' : 'সাপ্রেশন সরানো হয়েছে');
      fetchSuppressions(suppressionPage);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove suppression');
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {language === 'en' ? 'Zini-Mail AI Cold Outreach' : 'জিনি-মেইল এআই কোল্ড আউটরিচ'}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Global Hub
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {language === 'en'
                  ? 'Master platform AI routing, SERP discovery keys, throttling safety, and global suppression.'
                  : 'প্ল্যাটফর্ম এআই রাউটিং, সার্প ডিসকভারি কি, থ্রটলিং লিমিট ও সাপ্রেশন ব্ল্যাকলিস্ট কন্ট্রোল।'}
              </p>
            </div>
          </div>
        </div>

        {/* Master Emergency Kill-Switch Indicator */}
        <div className="flex items-center gap-3">
          {form.isEmergencyPaused ? (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl text-red-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider">{language === 'en' ? 'Queues Paused' : 'কিউ স্থগিত'}</div>
                <div className="text-[10px] text-red-400/80 max-w-[200px] truncate">{form.emergencyPausedReason || 'Emergency Kill-Switch Active'}</div>
              </div>
              <button
                type="button"
                onClick={() => setKillSwitchModalOpen(true)}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                {language === 'en' ? 'Resume' : 'চালু করুন'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-wider">{language === 'en' ? 'Queues Active' : 'কিউ চালু'}</div>
                <div className="text-[10px] text-muted-foreground">{language === 'en' ? 'Normal autonomous operation' : 'স্বাভাবিক কার্যক্রম চালু'}</div>
              </div>
              <button
                type="button"
                onClick={() => setKillSwitchModalOpen(true)}
                className="ml-2 px-3 py-1 bg-zinc-800 hover:bg-red-950/40 hover:text-red-400 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5 text-red-500" />
                {language === 'en' ? 'Kill-Switch' : 'কিল-সুইচ'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        
        {/* Section 1: AI Provider & Multi-Model Router */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/50 flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Bot className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-sm md:text-base font-bold text-foreground">
                  {language === 'en' ? 'Multi-Model AI Engine Routing' : 'মাল্টি-মডেল এআই ইঞ্জিন রাউটিং'}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'en'
                    ? 'Connect and select from your configured AI models in AI Settings for banner vision and cold email copywriting.'
                    : 'ব্যানার ভিশন এক্সট্র্যাকশন ও কোল্ড ইমেইল ড্রাফটিং এর জন্য আপনার কানেক্ট করা এআই মডেল নির্বাচন করুন।'}
                </p>
              </div>
            </div>

            <Link
              href="/sp@dmin/settings/ai"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-medium transition-colors shrink-0"
              title={language === 'en' ? 'Connect AI API Keys in AI Settings' : 'এআই সেটিংস পেজে এপিআই কি কানেক্ট করুন'}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Connect AI Models & API Keys' : 'এআই মডেল ও এপিআই কি কানেক্ট করুন'}</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision AI Model */}
            <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  {language === 'en' ? 'Banner Vision AI Model' : 'ব্যানার ভিশন এআই মডেল'}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md font-mono">
                  Multimodal
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {language === 'en' ? 'Select Connected Model' : 'কানেক্ট করা এআই মডেল নির্বাচন করুন'}
                  </label>
                  <select
                    value={selectedVisionConfigId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedVisionConfigId(cid);
                      if (cid !== 'custom') {
                        const found = connectedAiConfigs.find((c: any) => c.id === cid);
                        if (found) {
                          setForm((prev) => ({
                            ...prev,
                            visionAiProvider: found.provider || 'gemini',
                            visionAiModel: found.modelName || 'gemini-1.5-flash',
                          }));
                        }
                      }
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {connectedAiConfigs.length > 0 ? (
                      <>
                        <optgroup label={language === 'en' ? 'Connected Models (from AI Settings)' : 'কানেক্ট করা মডেলসমূহ (এআই সেটিংস থেকে)'}>
                          {connectedAiConfigs.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              [{c.provider?.toUpperCase()}] {c.name || c.modelName} ({c.modelName}) {c.isActive ? '• Active' : ''}
                            </option>
                          ))}
                        </optgroup>
                        <option value="custom">✏️ {language === 'en' ? 'Custom / Manual Model Name' : 'কাস্টম / ম্যানুয়াল মডেলের নাম'}</option>
                      </>
                    ) : (
                      <option value="custom">✏️ {language === 'en' ? 'No connected models found — Custom Input' : 'কোনো মডেল কানেক্ট করা নেই — কাস্টম লিখুন'}</option>
                    )}
                  </select>
                </div>

                {selectedVisionConfigId !== 'custom' ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{language === 'en' ? 'Selected:' : 'নির্বাচিত:'}</span>
                      <code className="text-foreground font-mono bg-black/30 px-1.5 py-0.5 rounded text-[11px]">{form.visionAiProvider} / {form.visionAiModel}</code>
                    </div>
                    <span className="text-[10px] text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/20">API Key Verified</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 border-t border-border/40">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        {language === 'en' ? 'Provider' : 'প্রোভাইডার'}
                      </label>
                      <select
                        value={form.visionAiProvider}
                        onChange={(e) => setForm({ ...form, visionAiProvider: e.target.value })}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="gemini">Google Gemini (Recommended for Banner Vision)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        {language === 'en' ? 'Model Name' : 'মডেলের নাম'}
                      </label>
                      <input
                        type="text"
                        value={form.visionAiModel}
                        onChange={(e) => setForm({ ...form, visionAiModel: e.target.value })}
                        placeholder="e.g. gemini-1.5-flash"
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Draft AI Model */}
            <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-orange-400" />
                  {language === 'en' ? 'Email Copywriter AI Model' : 'ইমেইল কপিরাইটার এআই মডেল'}
                </span>
                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-md font-mono">
                  Text Generation
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    {language === 'en' ? 'Select Connected Model' : 'কানেক্ট করা এআই মডেল নির্বাচন করুন'}
                  </label>
                  <select
                    value={selectedDraftConfigId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setSelectedDraftConfigId(cid);
                      if (cid !== 'custom') {
                        const found = connectedAiConfigs.find((c: any) => c.id === cid);
                        if (found) {
                          setForm((prev) => ({
                            ...prev,
                            draftAiProvider: found.provider || 'gemini',
                            draftAiModel: found.modelName || 'gemini-1.5-flash',
                          }));
                        }
                      }
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {connectedAiConfigs.length > 0 ? (
                      <>
                        <optgroup label={language === 'en' ? 'Connected Models (from AI Settings)' : 'কানেক্ট করা মডেলসমূহ (এআই সেটিংস থেকে)'}>
                          {connectedAiConfigs.map((c: any) => (
                            <option key={c.id} value={c.id}>
                              [{c.provider?.toUpperCase()}] {c.name || c.modelName} ({c.modelName}) {c.isActive ? '• Active' : ''}
                            </option>
                          ))}
                        </optgroup>
                        <option value="custom">✏️ {language === 'en' ? 'Custom / Manual Model Name' : 'কাস্টম / ম্যানুয়াল মডেলের নাম'}</option>
                      </>
                    ) : (
                      <option value="custom">✏️ {language === 'en' ? 'No connected models found — Custom Input' : 'কোনো মডেল কানেক্ট করা নেই — কাস্টম লিখুন'}</option>
                    )}
                  </select>
                </div>

                {selectedDraftConfigId !== 'custom' ? (
                  <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span>{language === 'en' ? 'Selected:' : 'নির্বাচিত:'}</span>
                      <code className="text-foreground font-mono bg-black/30 px-1.5 py-0.5 rounded text-[11px]">{form.draftAiProvider} / {form.draftAiModel}</code>
                    </div>
                    <span className="text-[10px] text-orange-300 font-semibold px-2 py-0.5 rounded bg-orange-500/20">API Key Verified</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 border-t border-border/40">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        {language === 'en' ? 'Provider' : 'প্রোভাইডার'}
                      </label>
                      <select
                        value={form.draftAiProvider}
                        onChange={(e) => setForm({ ...form, draftAiProvider: e.target.value })}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        <option value="gemini">Google Gemini (Lowest Latency & Context Cache)</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic Claude</option>
                        <option value="groq">Groq (Ultra-fast Llama 3.3)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        {language === 'en' ? 'Model Name' : 'মডেলের নাম'}
                      </label>
                      <input
                        type="text"
                        value={form.draftAiModel}
                        onChange={(e) => setForm({ ...form, draftAiModel: e.target.value })}
                        placeholder="e.g. gemini-1.5-flash"
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Model Recommendation & Best Practice Suggestion Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-primary/5 to-amber-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{language === 'en' ? 'AI Model Recommendations for Outreach Tasks' : 'আউটরিচ কাজের জন্য এআই মডেল ব্যবহারের সুপারিশ'}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Vision Recommendations */}
              <div className="bg-background/70 border border-border/60 p-3 rounded-lg space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Best for Banner Vision Analysis' : 'ব্যানার/ছবি বিশ্লেষণের জন্য সেরা'}
                </div>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold shrink-0">⭐ {language === 'en' ? 'Top Pick:' : 'সবচেয়ে সেরা:'}</span>
                    <span><strong className="text-foreground">Google Gemini 1.5 Flash / 2.0 Flash</strong> — {language === 'en' ? 'Extremely fast, lowest cost, and excels at extracting Bengali & English text, pricing, and offers directly from marketing banners.' : 'অতিদ্রুত, সাশ্রয়ী এবং ব্যানার থেকে বাংলা ও ইংরেজি টেক্সট, অফার ও ক্যাটাগরি নিখুঁতভাবে রিড করতে পারে।'}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold shrink-0">⚡ {language === 'en' ? 'Powerful:' : 'পাওয়ারফুল:'}</span>
                    <span><strong className="text-foreground">OpenAI GPT-4o / GPT-4o mini</strong> — {language === 'en' ? 'High-accuracy object detection and complex multi-product layout understanding.' : 'জটিল আর্টওয়ার্ক বা মাল্টি-অফার ব্যানার নিখুঁতভাবে বিশ্লেষণ করতে পারদর্শী।'}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold shrink-0">🎨 {language === 'en' ? 'Creative:' : 'ক্রিয়েটিভ:'}</span>
                    <span><strong className="text-foreground">Claude 3.5 Sonnet</strong> — {language === 'en' ? 'Nuanced aesthetic appreciation and brand tone interpretation.' : 'ব্র্যান্ড নান্দনিকতা ও ক্রিয়েটিভ ভিজ্যুয়াল অ্যানালাইসিস।'}</span>
                  </li>
                </ul>
              </div>

              {/* Copywriter Recommendations */}
              <div className="bg-background/70 border border-border/60 p-3 rounded-lg space-y-2">
                <div className="font-semibold text-orange-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Best for Cold Email Copywriting' : 'কোল্ড ইমেইল ড্রাফটিং এর জন্য সেরা'}
                </div>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-500 font-bold shrink-0">⭐ {language === 'en' ? 'Top Pick:' : 'সবচেয়ে সেরা:'}</span>
                    <span><strong className="text-foreground">Gemini 1.5 Flash / GPT-4o mini</strong> — {language === 'en' ? 'Ultra-low latency, budget friendly, and writes crisp, consultative B2B cold emails.' : 'সর্বোচ্চ স্পিড, কম টোকেন খরচ এবং টু-দ্য-পয়েন্ট উচ্চ-রূপান্তরকারী B2B কোল্ড ইমেইল পার্সোনালাইজেশন।'}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold shrink-0">✍️ {language === 'en' ? 'Human-Like:' : 'হিউম্যান টোন:'}</span>
                    <span><strong className="text-foreground">Claude 3.5 Haiku / Sonnet</strong> — {language === 'en' ? 'Unmatched natural, non-robotic, persuasive cold outreach email copy.' : 'অত্যন্ত স্বাভাবিক, সাবলীল এবং আন্তরিক হিউম্যান-লাইক কোল্ড ইমেইল লেখার জন্য সেরা।'}</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold shrink-0">🚀 {language === 'en' ? 'Ultra Fast:' : 'আল্ট্রা স্পিড:'}</span>
                    <span><strong className="text-foreground">Groq (Llama 3.3 70B)</strong> — {language === 'en' ? 'Lightning-fast bulk drafting for large prospect queues.' : 'বিশাল লিড কিউয়ের জন্য চোখের পলকে বাল্ক ইমেইল ড্রাফটিং।'}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between flex-wrap gap-2">
              <span>
                {language === 'en'
                  ? '💡 Tip: You can connect your preferred Gemini, OpenAI, Claude, or Groq API keys anytime in '
                  : '💡 টিপ: আপনি যেকোনো প্রোভাইডারের API Key দিয়ে ইচ্ছামতো মডেল যুক্ত করতে পারবেন '}
                <Link href="/sp@dmin/settings/ai" target="_blank" className="text-primary font-semibold hover:underline inline-flex items-center gap-0.5">
                  {language === 'en' ? 'Superadmin AI Settings' : 'সুপার অ্যাডমিন এআই সেটিংস (/sp@dmin/settings/ai)'}
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
                {language === 'en' ? '. The connected models will immediately appear in the dropdowns above for selection.' : ' থেকে। কানেক্ট করা মডেলগুলো স্বয়ংক্রিয়ভাবে উপরের ড্রপডাউনে চলে আসবে।'}
              </span>
              <Link href="/sp@dmin/settings/ai" target="_blank" className="text-xs px-2.5 py-1 rounded-md bg-surface hover:bg-border text-foreground border border-border/70 font-medium transition-colors inline-flex items-center gap-1 shrink-0">
                <Plus className="w-3 h-3 text-emerald-400" />
                {language === 'en' ? 'Connect AI Model / API Key' : 'এআই মডেল / এপিআই কি যুক্ত করুন'}
              </Link>
            </div>
          </div>
        </div>

        {/* Section 2: SERP Search Discovery Integration */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <Search className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-sm md:text-base font-bold text-foreground">
                  {language === 'en' ? 'SERP Discovery Engine (Lead Search)' : 'সার্প ডিসকভারি ইঞ্জিন (লিড সার্চ)'}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'en'
                    ? 'Automated search API for discovering niche B2B prospects and decision-maker contact emails.'
                    : 'নিশ B2B সম্ভাব্য ক্লায়েন্ট ও তাদের যোগাযোগ খোঁজার জন্য গুগল সার্চ এপিআই।'}
                </p>
              </div>
            </div>

            {form.hasExistingSerpKey && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                {language === 'en' ? 'AES-256 Key Configured' : 'এনক্রিপ্ট করা কি যুক্ত আছে'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'SERP Provider' : 'সার্প প্রোভাইডার'}
              </label>
              <select
                value={form.serpApiProvider}
                onChange={(e) => setForm({ ...form, serpApiProvider: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="serper">Serper.dev (Fast Google Search API)</option>
                <option value="valueserp">ValueSERP</option>
                <option value="google_custom_search">Google Custom Search Engine</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'SERP API Master Key' : 'সার্প এপিআই মাস্টার কি'}
              </label>
              <div className="relative">
                <input
                  type={showSerpKey ? 'text' : 'password'}
                  value={form.serpApiKey}
                  onChange={(e) => setForm({ ...form, serpApiKey: e.target.value })}
                  placeholder={
                    form.hasExistingSerpKey
                      ? '•••••••••••••••••••••••••••••••• (Leave blank to keep existing key)'
                      : 'Enter Serper.dev API Key'
                  }
                  className="w-full bg-surface border border-border rounded-xl pl-3 pr-24 py-2 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowSerpKey(!showSerpKey)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
                  >
                    {showSerpKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSerp}
                    disabled={testingSerp || (!form.hasExistingSerpKey && !form.serpApiKey)}
                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[10px] font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {testingSerp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    {language === 'en' ? 'Test' : 'টেস্ট'}
                  </button>
                </div>
              </div>
              {serpTestResult && (
                <div className={`mt-2 text-[11px] flex items-center gap-1.5 ${serpTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {serpTestResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>{serpTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Master System Prompts */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/50">
            <Sliders className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-foreground">
                {language === 'en' ? 'Platform Master Prompts' : 'প্ল্যাটফর্ম মাস্টার প্রম্পটস'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {language === 'en'
                  ? 'Define standardized system prompts executed by autonomous agents across all tenants.'
                  : 'সকল টেন্যান্টের অটোমেটেড ক্যাম্পেইনের জন্য স্ট্যান্ডার্ড এআই সিস্টেম প্রম্পট।'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-foreground flex items-center justify-between mb-1.5">
                <span>{language === 'en' ? 'Master Banner Vision Analysis Prompt' : 'মাস্টার ব্যানার ভিশন অ্যানালাইসিস প্রম্পট'}</span>
                <span className="text-[10px] text-muted-foreground font-normal">Must enforce JSON schema</span>
              </label>
              <textarea
                rows={5}
                value={form.masterVisionPrompt}
                onChange={(e) => setForm({ ...form, masterVisionPrompt: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono custom-scrollbar"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground flex items-center justify-between mb-1.5">
                <span>{language === 'en' ? 'Master Cold Email Drafting Prompt' : 'মাস্টার কোল্ড ইমেইল ড্রাফটিং প্রম্পট'}</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Tokens: {'{{companyName}}, {{painPoint}}, {{bannerAnalysis}}, {{offer}}, {{senderName}}'}
                </span>
              </label>
              <textarea
                rows={5}
                value={form.masterDraftPrompt}
                onChange={(e) => setForm({ ...form, masterDraftPrompt: e.target.value })}
                className="w-full bg-surface border border-border rounded-xl p-3 text-xs text-foreground focus:ring-1 focus:ring-emerald-500 outline-none font-mono custom-scrollbar"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Throttle, Quotas & Credit Costs */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/50">
            <Layers className="w-5 h-5 text-emerald-500" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-foreground">
                {language === 'en' ? 'Safety Throttling & Usage Credit Costs' : 'সেফটি থ্রটলিং ও ক্রেডিট কস্ট'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {language === 'en'
                  ? 'Anti-spam delay intervals, tenant daily ceiling, and credit deductions per AI task.'
                  : 'স্প্যাম প্রতিরোধে টাইম ইন্টারভাল, দৈনিক সর্বোচ্চ সীমা ও এআই ব্যবহারের ক্রেডিট চার্জ।'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Min Interval Between Emails' : 'মিনিমাম ইমেইল ইন্টারভাল'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={600}
                  value={form.minThrottleIntervalSec}
                  onChange={(e) => setForm({ ...form, minThrottleIntervalSec: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-medium">sec</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">Default: 45s (Prevents ISP flagging)</span>
            </div>

            <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Daily Max Emails / Tenant' : 'দৈনিক সর্বোচ্চ ইমেইল / টেন্যান্ট'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={form.dailyMaxEmailsPerTenant}
                  onChange={(e) => setForm({ ...form, dailyMaxEmailsPerTenant: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-medium">emails</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">Warmup protection safeguard</span>
            </div>

            <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Vision AI Credit Cost' : 'ভিশন এআই ক্রেডিট খরচ'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.visionCreditCost}
                  onChange={(e) => setForm({ ...form, visionCreditCost: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-medium">credits</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">Deducted on banner analysis</span>
            </div>

            <div className="bg-background/50 border border-border/50 p-4 rounded-xl">
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                {language === 'en' ? 'Draft AI Credit Cost' : 'ড্রাফট এআই ক্রেডিট খরচ'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.draftCreditCost}
                  onChange={(e) => setForm({ ...form, draftCreditCost: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-muted-foreground font-medium">credits</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">Deducted per personalized email</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {language === 'en' ? 'Save Platform Settings' : 'প্ল্যাটফর্ম সেটিংস সংরক্ষণ করুন'}
          </button>
        </div>
      </form>

      {/* Section 5: Platform Suppression & Blacklist Manager */}
      <div className="bg-surface/70 backdrop-blur-xl border border-border p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm md:text-base font-bold text-foreground">
                {language === 'en' ? 'Global Outreach Suppression Blacklist' : 'গ্লোবাল আউটরিচ সাপ্রেশন ব্ল্যাকলিস্ট'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {language === 'en'
                  ? 'Blocked recipients, unsubscribe opt-outs, and hard-bounced addresses barred from cold outreach.'
                  : 'সকল টেন্যান্টের জন্য কোল্ড ইমেইল পাঠানো নিষিদ্ধ এমন আনসাবস্ক্রাইবড বা বাউন্সড ইমেইল তালিকা।'}
              </p>
            </div>
          </div>

          <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-mono self-start sm:self-center">
            {suppressionTotal} {language === 'en' ? 'Blocked Records' : 'ব্লকড রেকর্ড'}
          </span>
        </div>

        {/* Add Suppression Form */}
        <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            required
            value={newSuppressionEmail}
            onChange={(e) => setNewSuppressionEmail(e.target.value)}
            placeholder="e.g. competitor@example.com or @spammer.org"
            className="flex-1 bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-red-500 outline-none font-mono"
          />
          <select
            value={newSuppressionReason}
            onChange={(e) => setNewSuppressionReason(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-red-500 outline-none sm:w-44"
          >
            <option value="admin_blocked">Admin Blocked</option>
            <option value="opt_out">Unsubscribe Opt-Out</option>
            <option value="bounce_hard">Hard Bounce</option>
            <option value="complaint">Spam Complaint</option>
          </select>
          <button
            type="submit"
            disabled={addingSuppression || !newSuppressionEmail.trim()}
            className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {addingSuppression ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            {language === 'en' ? 'Add Blacklist' : 'ব্ল্যাকলিস্টে যুক্ত করুন'}
          </button>
        </form>

        {/* Suppression Table */}
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-background/80 text-[11px] text-muted-foreground uppercase tracking-wider border-b border-border/50">
              <tr>
                <th className="px-4 py-3">{language === 'en' ? 'Email / Domain' : 'ইমেইল / ডোমেইন'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Reason' : 'কারণ'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Scope' : 'স্কোপ'}</th>
                <th className="px-4 py-3">{language === 'en' ? 'Added Date' : 'যুক্ত করার তারিখ'}</th>
                <th className="px-4 py-3 text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {suppressions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    {language === 'en' ? 'No suppressed emails found.' : 'কোনো সাপ্রেশন রেকর্ড পাওয়া যায়নি।'}
                  </td>
                </tr>
              ) : (
                suppressions.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-foreground">{item.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">
                      {item.tenantId ? `Tenant (${item.tenantId.slice(0, 8)}...)` : 'Platform Global'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteSuppression(item.id, item.email)}
                        className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={language === 'en' ? 'Remove from Blacklist' : 'মুছে ফেলুন'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Suppression Pagination */}
        {suppressionTotal > suppressionLimit && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              {language === 'en'
                ? `Showing ${suppressions.length} of ${suppressionTotal} suppressions`
                : `${suppressionTotal} টির মধ্যে ${suppressions.length} টি দেখানো হচ্ছে`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={suppressionPage <= 1}
                onClick={() => fetchSuppressions(suppressionPage - 1)}
                className="px-2.5 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-muted text-xs"
              >
                {language === 'en' ? 'Prev' : 'আগের'}
              </button>
              <span className="px-2 font-mono">{suppressionPage}</span>
              <button
                disabled={suppressionPage * suppressionLimit >= suppressionTotal}
                onClick={() => fetchSuppressions(suppressionPage + 1)}
                className="px-2.5 py-1 border border-border rounded-lg disabled:opacity-40 hover:bg-muted text-xs"
              >
                {language === 'en' ? 'Next' : 'পরের'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Kill-Switch Confirmation Modal */}
      {killSwitchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isEmergencyPaused ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {form.isEmergencyPaused ? <CheckCircle2 className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {form.isEmergencyPaused
                    ? (language === 'en' ? 'Resume Outreach Queues?' : 'আউটরিচ কিউ পুনরায় চালু করবেন?')
                    : (language === 'en' ? 'Activate Emergency Kill-Switch?' : 'ইমার্জেন্সি কিল-সুইচ চালু করবেন?')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {form.isEmergencyPaused
                    ? (language === 'en' ? 'All autonomous email jobs will resume dispatching.' : 'সকল নির্ধারিত ইমেইল পাঠানো আবার চালু হবে।')
                    : (language === 'en' ? 'Instantly freezes all outgoing cold email jobs platform-wide.' : 'প্ল্যাটফর্মের সকল কোল্ড ইমেইল পাঠানো তাৎক্ষণিক স্থগিত হবে।')}
                </p>
              </div>
            </div>

            {!form.isEmergencyPaused && (
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  {language === 'en' ? 'Reason for Emergency Pause' : 'স্থগিত করার কারণ (ঐচ্ছিক)'}
                </label>
                <input
                  type="text"
                  value={killSwitchReason}
                  onChange={(e) => setKillSwitchReason(e.target.value)}
                  placeholder="e.g. SMTP IP reputation investigation"
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKillSwitchModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleToggleKillSwitch}
                disabled={togglingKillSwitch}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-colors flex items-center gap-1.5 ${
                  form.isEmergencyPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {togglingKillSwitch && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {form.isEmergencyPaused
                  ? (language === 'en' ? 'Confirm Resume' : 'চালু নিশ্চিত করুন')
                  : (language === 'en' ? 'Confirm Emergency Pause' : 'স্থগিত নিশ্চিত করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
