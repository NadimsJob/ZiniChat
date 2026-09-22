'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';
import { FacebookBadgeIcon as Facebook } from '@/components/BrandIcons';
import { 
  Bot, AlertTriangle, DollarSign, TrendingUp, 
  BarChart3, Eye, MousePointer, ShieldCheck, Lock, ArrowRight, RefreshCw,
  Send, Sparkles, CheckCircle2, PauseCircle, PlayCircle, Image as ImageIcon,
  Check, X, ChevronRight, Layers, HelpCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AdsAgentPage() {
  const { language } = useLanguage();
  const { enabled: rolloutEnabled, loading: rolloutLoading } = useRolloutFlag('meta_ads_agent');

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'creator' | 'manager'
  const [activeTab, setActiveTab] = useState<'creator' | 'manager'>('creator');

  // 5-Turn AI Chat Agent State
  const [draftId, setDraftId] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'ai' | 'user'; text: string; data?: any }>>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Dhaka', 'Bangladesh']);
  const [budget, setBudget] = useState<number>(500);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [placements, setPlacements] = useState<string[]>(['facebook', 'instagram']);
  const [creative, setCreative] = useState<{ headline: string; bodyText: string; callToAction: string; imageUrl: string }>({
    headline: '',
    bodyText: '',
    callToAction: 'SHOP_NOW',
    imageUrl: '',
  });
  const [summaryCard, setSummaryCard] = useState<any>(null);

  const [submittingTurn, setSubmittingTurn] = useState(false);
  const [launchingSaga, setLaunchingSaga] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState<any>(null);
  const [userTextInput, setUserTextInput] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchConnectedAccounts();
    fetchMcpTools();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountData(selectedAccountId);
      fetchTenantDrafts();
    }
  }, [selectedAccountId]);

  const fetchConnectedAccounts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads-account/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccountId(data[0].adAccountId);
        }
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMcpTools = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/mcp-ads/tools`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMcpTools(data);
      }
    } catch (err) {
      console.error('Error fetching MCP tools:', err);
    }
  };

  const fetchAccountData = async (adAccountId: string) => {
    setFetchingData(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [balanceRes, campaignsRes, insightsRes] = await Promise.all([
        fetch(`${API_URL}/mcp-ads/balance/${adAccountId}`, { headers }),
        fetch(`${API_URL}/mcp-ads/campaigns/${adAccountId}`, { headers }),
        fetch(`${API_URL}/mcp-ads/insights/${adAccountId}?datePreset=last_30d`, { headers }),
      ]);

      if (balanceRes.ok) {
        setAccountBalance(await balanceRes.json());
      }
      if (campaignsRes.ok) {
        setCampaigns(await campaignsRes.json());
      }
      if (insightsRes.ok) {
        setInsights(await insightsRes.json());
      }
    } catch (err: any) {
      console.error('Error fetching account data:', err);
      setError(language === 'en' ? 'Failed to load ad account telemetry from Meta' : 'মেটা থেকে অ্যাড অ্যাকাউন্ট মেট্রিক্স লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setFetchingData(false);
    }
  };

  const fetchTenantDrafts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/drafts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const drafts = await res.json();
        setCampaigns((prev) => {
          // Merge drafts with campaigns
          const combined = [...drafts, ...prev.filter((c) => !drafts.some((d: any) => d.metaCampaignId === c.id))];
          return combined;
        });
      }
    } catch (err) {
      console.error('Error fetching drafts:', err);
    }
  };

  // Start 5-Turn AI Campaign Session
  const startNewCampaignSession = async () => {
    if (!selectedAccountId) return;
    setSubmittingTurn(true);
    setLaunchSuccess(null);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/init`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adAccountId: selectedAccountId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to start AI ad session');
      }

      const data = await res.json();
      setDraftId(data.draftId);
      setCurrentTurn(1);
      setCatalogProducts(data.products || []);
      setChatMessages([
        {
          role: 'ai',
          text: language === 'en' ? data.aiMessage.en : data.aiMessage.bn,
        },
      ]);
    } catch (err: any) {
      console.error('Error init draft:', err);
      setError(err.message);
    } finally {
      setSubmittingTurn(false);
    }
  };

  // Process Conversation Turn (Turns 1 -> 5)
  const submitTurn = async (turnPayload: any) => {
    if (!draftId) return;
    setSubmittingTurn(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/turn`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          draftId,
          turn: currentTurn,
          ...turnPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to process turn');
      }

      const data = await res.json();
      const nextTurn = data.currentTurn;
      setCurrentTurn(nextTurn);

      // Append user message & AI response to chat
      const aiText = language === 'en' ? data.aiMessage.en : data.aiMessage.bn;
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: aiText, data },
      ]);

      if (nextTurn === 4 && data.creative) {
        setCreative(data.creative);
      }

      if (nextTurn === 5 && data.summaryCard) {
        setSummaryCard(data.summaryCard);
      }
    } catch (err: any) {
      console.error('Error submitting turn:', err);
      setError(err.message);
    } finally {
      setSubmittingTurn(false);
      setUserTextInput('');
    }
  };

  // Turn 5 Saga Execution: Approve & Run Ad
  const handleApproveAndRunAd = async () => {
    if (!draftId) return;
    setLaunchingSaga(true);
    setError(null);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ draftId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Campaign launch saga failed');
      }

      const data = await res.json();
      setLaunchSuccess(data);
      fetchAccountData(selectedAccountId);
      fetchTenantDrafts();
    } catch (err: any) {
      console.error('Error launching campaign saga:', err);
      setError(err.message);
    } finally {
      setLaunchingSaga(false);
    }
  };

  // Toggle Auto-Scaling for Campaign
  const handleToggleAutoScaling = async (draftId: string, currentEnabled: boolean, currentBudget: number) => {
    let maxBudget = currentBudget * 2;
    if (!currentEnabled) {
      const input = prompt(
        language === 'en'
          ? `Enter Maximum Daily Budget Cap for Auto-scaling (${accountBalance?.currency || 'BDT'}):`
          : `অটো-স্কেলিংয়ের জন্য সর্বোচ্চ দৈনিক বাজেট ক্যাপ দিন (${accountBalance?.currency || 'BDT'}):`,
        String(currentBudget * 2)
      );
      if (!input || isNaN(Number(input))) return;
      maxBudget = Number(input);
    }

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/campaigns/${draftId}/auto-scale`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: !currentEnabled, maxBudget }),
      });

      if (res.ok) {
        fetchAccountData(selectedAccountId);
        fetchTenantDrafts();
      }
    } catch (err) {
      console.error('Error toggling auto-scaling:', err);
    }
  };

  // Toggle Pause/Resume Campaign
  const toggleCampaignStatus = async (draftOrCompId: string, action: 'PAUSE' | 'RESUME') => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/ads-agent/campaigns/${draftOrCompId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        fetchAccountData(selectedAccountId);
        fetchTenantDrafts();
      }
    } catch (err) {
      console.error('Error toggling campaign status:', err);
    }
  };

  if (loading || rolloutLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#1F824A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Feature Rollout Gating Check
  if (!rolloutEnabled) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-lg text-center shadow-2xl">
          <div className="w-16 h-16 bg-[#EE8D27]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EE8D27]/20">
            <Lock className="w-8 h-8 text-[#EE8D27]" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {language === 'en' ? 'Ads Copilot Feature Locked' : 'অ্যাডস কোপাইলট বৈশিষ্ট্যটি আপনার জন্য লক করা আছে'}
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {language === 'en' 
              ? 'Ads Copilot is currently restricted under your organization or subscription plan. Please contact your platform administrator or upgrade your package to unlock AI Ad Management.'
              : 'অ্যাডস কোপাইলট বর্তমানে আপনার সাবস্ক্রিপশন প্ল্যান বা প্ল্যাটফর্ম কনফিগারেশনের অধীনে আনলক করা নেই। আনলক করতে অ্যাডমিনের সাথে যোগাযোগ করুন বা প্ল্যান আপগ্রেড করুন।'}
          </p>
          <Link 
            href="/dashboard/settings/subscription"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1F824A] to-[#EE8D27] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {language === 'en' ? 'View Upgrade Options' : 'আপগ্রেড অপশন দেখুন'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-[#1F824A]" />
            {language === 'en' ? 'Ads Copilot (AI Ad Manager)' : 'অ্যাডস কোপাইলট (AI বিজ্ঞাপন ম্যানেজার)'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {language === 'en'
              ? 'Create, launch, and optimize Meta ads with step-by-step AI guidance and automated quota protection.'
              : 'AI-এর দিকনির্দেশনা ও স্বয়ংক্রিয় কোটা সুরক্ষায় Meta বিজ্ঞাপন তৈরি, সাবমিট ও অপ্টিমাইজ করুন।'}
          </p>
        </div>

        {accounts.length > 0 && (
          <div className="flex items-center gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-surface/90 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#1F824A]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.adAccountId} className="bg-zinc-900 text-white">
                  {acc.adAccountName || 'Ad Account'} ({acc.adAccountId})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedAccountId && fetchAccountData(selectedAccountId)}
              disabled={fetchingData}
              className="p-2 bg-surface/90 border border-white/10 rounded-xl text-white hover:bg-white/5 transition-colors disabled:opacity-50"
              title={language === 'en' ? 'Refresh Metrics' : 'রিফ্রেশ করুন'}
            >
              <RefreshCw className={`w-4 h-4 ${fetchingData ? 'animate-spin text-[#1F824A]' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Quota Sharing Warning Banner */}
      <div className="bg-[#EE8D27]/10 border border-[#EE8D27]/30 rounded-xl p-4 flex items-center gap-3 text-sm text-[#EE8D27]">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-semibold">
            {language === 'en' ? 'Quota Sharing Notice: ' : 'কোটা শেয়ারিং সতর্কতা: '}
          </span>
          {language === 'en'
            ? 'Ads Copilot and AI Chatbot share the same AI Response quota pool from your subscription.'
            : 'Ads Copilot এবং AI Chatbot আপনার সাবস্ক্রিপশনের একই AI Response কোটা শেয়ার করে।'}
        </div>
      </div>

      {/* Empty State when no accounts connected */}
      {accounts.length === 0 ? (
        <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
          <Facebook className="w-16 h-16 text-[#1877F2]/60 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {language === 'en' ? 'No Connected Meta Ad Account' : 'কোনো মেটা অ্যাড অ্যাকাউন্ট সংযুক্ত নেই'}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            {language === 'en'
              ? 'Connect your Facebook Ad Account in settings to start monitoring performance and launching AI-assisted campaigns.'
              : 'পারফরম্যান্স পর্যবেক্ষণ এবং এআই অ্যাপ চালিত বিজ্ঞাপন তৈরি করতে সেটিংসে আপনার মেটা অ্যাড অ্যাকাউন্ট সংযুক্ত করুন।'}
          </p>
          <Link
            href="/dashboard/settings/meta-ads"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Facebook className="w-4 h-4" />
            {language === 'en' ? 'Connect Meta Ad Account' : 'মেটা অ্যাড অ্যাকাউন্ট কানেক্ট করুন'}
          </Link>
        </div>
      ) : (
        <>
          {/* Telemetry Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {language === 'en' ? 'Account Status' : 'অ্যাকাউন্ট স্ট্যাটাস'}
                </span>
                <ShieldCheck className="w-4 h-4 text-[#1F824A]" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-lg font-bold text-white">
                  {accountBalance ? (accountBalance.accountStatus === 1 ? 'Active (🟢)' : 'Review Needed') : 'Active'}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">ID: {selectedAccountId}</p>
            </div>

            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {language === 'en' ? 'Account Balance' : 'বর্তমান ব্যালেন্স'}
                </span>
                <DollarSign className="w-4 h-4 text-[#EE8D27]" />
              </div>
              <div className="text-xl font-bold text-white">
                {accountBalance ? `${accountBalance.currency} ${accountBalance.balance.toFixed(2)}` : '—'}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {accountBalance?.spendCap ? `Spend Cap: ${accountBalance.currency} ${accountBalance.spendCap}` : 'No spend cap set'}
              </p>
            </div>

            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  {language === 'en' ? 'Total Amount Spent' : 'মোট খরচ'}
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white">
                {accountBalance ? `${accountBalance.currency} ${accountBalance.amountSpent.toFixed(2)}` : '—'}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {language === 'en' ? 'Lifetime ad account spend' : 'জীবনকালের মোট বিজ্ঞাপন খরচ'}
              </p>
            </div>
          </div>

          {/* Tab Navigation Switcher */}
          <div className="flex items-center border-b border-white/10 gap-6">
            <button
              onClick={() => setActiveTab('creator')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'creator'
                  ? 'border-[#1F824A] text-[#1F824A]'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {language === 'en' ? 'AI Ad Creator (5-Turn Agent)' : 'AI বিজ্ঞাপন ক্রিয়েটর (৫-টার্ন এজেন্ট)'}
            </button>
            <button
              onClick={() => setActiveTab('manager')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'manager'
                  ? 'border-[#1F824A] text-[#1F824A]'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {language === 'en' ? 'Campaign Manager & Telemetry' : 'ক্যাম্পেইন ম্যানেজার ও মেট্রিক্স'}
            </button>
          </div>

          {/* TAB 1: AI AD CREATOR (5-TURN FLOW) */}
          {activeTab === 'creator' && (
            <div className="space-y-6">
              {/* Start Session / Reset Button */}
              {!draftId ? (
                <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#1F824A]/10 rounded-2xl flex items-center justify-center mx-auto border border-[#1F824A]/20">
                    <Sparkles className="w-8 h-8 text-[#1F824A]" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {language === 'en' ? 'Launch New Meta Ad Campaign with AI' : 'AI-এর সাহায্যে নতুন Meta অ্যাড তৈরি করুন'}
                  </h3>
                  <p className="text-sm text-text-secondary max-w-lg mx-auto">
                    {language === 'en'
                      ? 'Our AI will guide you through 5 quick steps: product selection, target audience, budget setting, creative copy design, and final approval.'
                      : 'আমাদের AI আপনাকে ৫টি দ্রুত ধাপে গাইড করবে: পণ্য নির্বাচন, টার্গেট অডিয়েন্স, বাজেট সেটআপ, বিজ্ঞাপন বিবরণ তৈরি ও চূড়ান্ত প্রকাশ।'}
                  </p>
                  <button
                    onClick={startNewCampaignSession}
                    disabled={submittingTurn}
                    className="px-6 py-3 bg-gradient-to-r from-[#1F824A] to-[#EE8D27] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" />
                    {submittingTurn
                      ? (language === 'en' ? 'Initializing AI Session...' : 'AI সেশন চালু হচ্ছে...')
                      : (language === 'en' ? 'Start AI Ad Creation' : 'বিজ্ঞাপন তৈরি শুরু করুন')}
                  </button>
                </div>
              ) : (
                <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
                  {/* Step Stepper Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-[#1F824A]" />
                      <span className="font-semibold text-white">
                        {language === 'en' ? `Step ${currentTurn} of 5` : `ধাপ ${currentTurn} (মোট ৫)`}
                      </span>
                    </div>
                    <button
                      onClick={startNewCampaignSession}
                      className="text-xs text-text-secondary hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {language === 'en' ? 'Start Over' : 'নতুন করে শুরু'}
                    </button>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Chat Conversation History */}
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-[#1F824A]/20 border border-[#1F824A]/40 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-[#1F824A]" />
                          </div>
                        )}
                        <div
                          className={`p-4 rounded-2xl max-w-xl text-sm ${
                            msg.role === 'user'
                              ? 'bg-[#1F824A] text-white rounded-br-none'
                              : 'bg-surface-light border border-white/10 text-zinc-100 rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* TURN 1: Catalog Product Picker */}
                  {currentTurn === 1 && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <h4 className="text-sm font-semibold text-white">
                        {language === 'en' ? 'Select Product from Catalog:' : 'ক্যাটালগ থেকে প্রোডাক্ট বাছাই করুন:'}
                      </h4>
                      {catalogProducts.length === 0 ? (
                        <p className="text-xs text-text-secondary">
                          {language === 'en' ? 'No catalog products found. Type product name below.' : 'কোনো পণ্য পাওয়া যায়নি। নিচে নাম লিখে সাবমিট করুন।'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {catalogProducts.map((p) => {
                            const isSelected = selectedProductIds.includes(p.id);
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedProductIds(
                                    isSelected
                                      ? selectedProductIds.filter((id) => id !== p.id)
                                      : [...selectedProductIds, p.id]
                                  );
                                }}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-[#1F824A]/20 border-[#1F824A] text-white'
                                    : 'bg-surface-light border-white/5 text-zinc-300 hover:border-white/20'
                                }`}
                              >
                                <div className="font-semibold text-sm truncate">{p.name}</div>
                                <div className="text-xs text-[#EE8D27] font-bold mt-1">৳{p.price || 'Discuss'}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={userTextInput}
                          onChange={(e) => setUserTextInput(e.target.value)}
                          placeholder={language === 'en' ? 'Or type promotion details...' : 'অথবা অফারের বিবরণ লিখুন...'}
                          className="flex-1 bg-surface-light border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#1F824A]"
                        />
                        <button
                          onClick={() => submitTurn({ productIds: selectedProductIds, userMessage: userTextInput })}
                          disabled={submittingTurn || (selectedProductIds.length === 0 && !userTextInput.trim())}
                          className="px-5 py-2 bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {language === 'en' ? 'Next' : 'পরবর্তী'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TURN 2: Audience & Target Location */}
                  {currentTurn === 2 && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                        ⭐ <strong>Advantage+ Audience:</strong> Meta-র সর্বশেষ AI অ্যালগরিদম যা অটোমেটিক সেরা কাস্টমার টার্গেট করে।
                      </div>
                      <h4 className="text-sm font-semibold text-white">
                        {language === 'en' ? 'Target Locations:' : 'বিজ্ঞাপনের অবস্থান নির্বাচন:'}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Bangladesh (Whole Country)'].map((loc) => {
                          const isSel = selectedLocations.includes(loc);
                          return (
                            <button
                              key={loc}
                              onClick={() => {
                                setSelectedLocations(
                                  isSel ? selectedLocations.filter((l) => l !== loc) : [...selectedLocations, loc]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                isSel
                                  ? 'bg-[#1F824A] text-white border-[#1F824A]'
                                  : 'bg-surface-light text-zinc-300 border-white/10 hover:border-white/30'
                              }`}
                            >
                              {loc}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => submitTurn({ locations: selectedLocations })}
                          disabled={submittingTurn || selectedLocations.length === 0}
                          className="px-5 py-2 bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {language === 'en' ? 'Next Step' : 'পরবর্তী ধাপ'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TURN 3: Budget & Placements */}
                  {currentTurn === 3 && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">
                            {language === 'en' ? 'Daily Budget (৳):' : 'দৈনিক বাজেট (টাকা):'}
                          </label>
                          <input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(Number(e.target.value))}
                            className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#1F824A]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-300 block mb-1">
                            {language === 'en' ? 'Duration (Days):' : 'স্থায়িত্ব (দিন):'}
                          </label>
                          <input
                            type="number"
                            value={durationDays}
                            onChange={(e) => setDurationDays(Number(e.target.value))}
                            className="w-full bg-surface-light border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#1F824A]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => submitTurn({ budget, durationDays, placements })}
                          disabled={submittingTurn || budget <= 0}
                          className="px-5 py-2 bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {language === 'en' ? 'Generate AI Creative' : 'AI কপি ডিজাইন করুন'}
                          <Sparkles className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TURN 4: Creative Review Mockup */}
                  {currentTurn === 4 && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#EE8D27]" />
                        {language === 'en' ? 'Ad Creative Preview & Customization:' : 'বিজ্ঞাপন ডিজাইন ও এডিটর:'}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Live Ad Mockup Preview */}
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                            <Facebook className="w-5 h-5 text-[#1877F2]" />
                            <div>
                              <div className="text-xs font-bold text-white">Your Brand Page</div>
                              <div className="text-[10px] text-zinc-400">Sponsored · 🌐</div>
                            </div>
                          </div>
                          <p className="text-xs text-zinc-200 font-sans leading-relaxed">{creative.bodyText}</p>
                          {creative.imageUrl ? (
                            <img src={creative.imageUrl} alt="Ad Media" className="w-full h-44 object-cover rounded-xl border border-white/10" />
                          ) : (
                            <div className="w-full h-44 bg-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-500">
                              Product Image Preview
                            </div>
                          )}
                          <div className="bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-white/5">
                            <div>
                              <div className="text-xs font-bold text-white">{creative.headline}</div>
                              <div className="text-[10px] text-zinc-400">zinichat.com</div>
                            </div>
                            <span className="px-3 py-1 bg-zinc-700 text-white rounded text-xs font-semibold uppercase">
                              {creative.callToAction}
                            </span>
                          </div>
                        </div>

                        {/* Edit Form */}
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-zinc-300">
                              {language === 'en' ? 'Headline (Max 40 chars):' : 'হেডলাইন (সর্বোচ্চ ৪০ অক্ষর):'}
                            </label>
                            <input
                              type="text"
                              value={creative.headline}
                              onChange={(e) => setCreative({ ...creative, headline: e.target.value })}
                              className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1F824A]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-zinc-300">
                              {language === 'en' ? 'Body Text (Max 125 chars):' : 'মেসেজ বিবরণ (সর্বোচ্চ ১২৫ অক্ষর):'}
                            </label>
                            <textarea
                              value={creative.bodyText}
                              rows={3}
                              onChange={(e) => setCreative({ ...creative, bodyText: e.target.value })}
                              className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1F824A]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-zinc-300">
                              {language === 'en' ? 'Image URL:' : 'ছবি ইউআরএল:'}
                            </label>
                            <input
                              type="text"
                              value={creative.imageUrl}
                              onChange={(e) => setCreative({ ...creative, imageUrl: e.target.value })}
                              className="w-full bg-surface-light border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#1F824A]"
                            />
                          </div>
                          <button
                            onClick={() => submitTurn({ ...creative })}
                            disabled={submittingTurn}
                            className="w-full py-2.5 bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            {language === 'en' ? 'Finalize Ad Summary' : 'ক্যাম্পেইন সামারি প্রস্তুত করুন'}
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TURN 5: Final Approval Summary Card & Saga Execution */}
                  {currentTurn === 5 && summaryCard && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <div className="bg-surface-light border border-white/10 rounded-2xl p-6 space-y-4">
                        <h4 className="text-md font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          {language === 'en' ? 'Campaign Final Approval Summary' : 'ক্যাম্পেইন চড়ান্ত অনুমোদন সামারি'}
                        </h4>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                            <span className="text-zinc-400">Headline:</span>
                            <div className="font-semibold text-white mt-0.5 truncate">{summaryCard.headline}</div>
                          </div>
                          <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                            <span className="text-zinc-400">Budget:</span>
                            <div className="font-semibold text-emerald-400 mt-0.5">{summaryCard.currency} {summaryCard.budget}/day</div>
                          </div>
                          <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                            <span className="text-zinc-400">Duration:</span>
                            <div className="font-semibold text-white mt-0.5">{summaryCard.durationDays} Days</div>
                          </div>
                          <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                            <span className="text-zinc-400">AI Units Cost:</span>
                            <div className="font-semibold text-[#EE8D27] mt-0.5">{summaryCard.aiResponseUnitsRequired} Units</div>
                          </div>
                        </div>

                        {/* Quota Deduction Warning Notice */}
                        <div className="p-4 bg-[#EE8D27]/10 border border-[#EE8D27]/30 rounded-xl text-xs text-[#EE8D27] flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>
                            {language === 'en'
                              ? `Approving will reserve ${summaryCard.aiResponseUnitsRequired} AI Response units from your subscription quota pool. If launch fails, units are automatically refunded.`
                              : `বিজ্ঞাপন সাবমিট করলে আপনার কোটা থেকে ${summaryCard.aiResponseUnitsRequired}টি AI Response ইউনিট রিজার্ভ করা হবে। প্রকাশে কোনো সমস্যা হলে ইউনিট ফেরত দেওয়া হবে।`}
                          </span>
                        </div>

                        {launchSuccess ? (
                          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>{launchSuccess.message} (Campaign ID: {launchSuccess.metaCampaignId})</span>
                          </div>
                        ) : (
                          <div className="flex gap-3 justify-end pt-2">
                            <button
                              onClick={() => setCurrentTurn(4)}
                              disabled={launchingSaga}
                              className="px-4 py-2.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors"
                            >
                              {language === 'en' ? 'Edit Details' : 'সংশোধন করুন'}
                            </button>
                            <button
                              onClick={handleApproveAndRunAd}
                              disabled={launchingSaga}
                              className="px-6 py-2.5 bg-gradient-to-r from-[#1F824A] to-[#EE8D27] text-white font-bold rounded-xl text-xs hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                            >
                              {launchingSaga ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  {language === 'en' ? 'Submitting to Meta...' : 'Meta-তে সাবমিট হচ্ছে...'}
                                </>
                              ) : (
                                <>
                                  <Rocket className="w-4 h-4" />
                                  {language === 'en' ? '🚀 Approve & Publish Ad' : '🚀 বিজ্ঞাপন সাবমিট ও পাবলিশ করুন'}
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAMPAIGN MANAGER */}
          {activeTab === 'manager' && (
            <div className="space-y-6">
              {/* Campaign Table */}
              <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-4 flex items-center justify-between">
                  <span>{language === 'en' ? 'Meta Campaigns & Drafts' : 'ক্যাম্পেইনসমূহ ও ড্রাফট'}</span>
                  <span className="text-xs bg-surface px-2.5 py-1 rounded-md text-text-secondary border border-white/5 font-mono">
                    {campaigns.length} Total
                  </span>
                </h2>

                {campaigns.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                    <p className="text-sm text-text-secondary">
                      {language === 'en' ? 'No ad campaigns launched yet.' : 'এখনো কোনো বিজ্ঞাপন প্রকাশ করা হয়নি।'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((c) => (
                      <div key={c.id} className="p-4 bg-surface-light border border-white/5 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white text-sm">{c.headline || c.name || 'Ad Campaign'}</h4>
                            {c.autoScalingEnabled && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#1F824A]/20 text-[#1F824A] border border-[#1F824A]/40 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Auto-Scaling (Max: {c.currency || '৳'}{c.autoScalingMaxBudget || Number(c.budget) * 2})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                            <span className="font-mono bg-surface px-1.5 py-0.5 rounded text-[10px]">ID: {c.metaCampaignId || c.id}</span>
                            {c.budget && (
                              <span className="text-emerald-400 font-semibold">
                                Budget: {c.currency || '$'}{c.budget}/day
                              </span>
                            )}
                            {c.failureReason && (
                              <span className="text-red-400 text-[10px]">Reason: {c.failureReason}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {c.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleToggleAutoScaling(c.id, Boolean(c.autoScalingEnabled), Number(c.budget || 500))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                                c.autoScalingEnabled
                                  ? 'bg-[#1F824A] text-white border-[#1F824A]'
                                  : 'bg-surface text-zinc-400 border-white/10 hover:text-white'
                              }`}
                              title={language === 'en' ? 'Toggle Auto-Scaling Engine' : 'অটো-স্কেলিং চালু/বন্ধ করুন'}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {c.autoScalingEnabled ? 'Auto-Scaling ON' : 'Auto-Scaling OFF'}
                            </button>
                          )}

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              c.status === 'ACTIVE'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : c.status === 'PENDING_REVIEW'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : c.status === 'FAILED_REFUNDED' || c.status === 'REJECTED_BY_META'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {c.status}
                          </span>

                          {c.metaCampaignId && (
                            <button
                              onClick={() => toggleCampaignStatus(c.id, c.status === 'ACTIVE' ? 'PAUSE' : 'RESUME')}
                              className="p-1.5 bg-surface border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors"
                              title={c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                            >
                              {c.status === 'ACTIVE' ? <PauseCircle className="w-4 h-4 text-amber-400" /> : <PlayCircle className="w-4 h-4 text-emerald-400" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Rocket(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.19-2.5-.59-.69-1.69-.77-2.39-.08z"/>
      <path d="M12 15l-3-3 7.35-7.35c.78-.78 2.05-.78 2.83 0v0c.78.78.78 2.05 0 2.83L12 15z"/>
      <path d="M9 18c-4.51 2-5-2-7-2"/>
      <path d="M15 12l6 6"/>
    </svg>
  );
}
