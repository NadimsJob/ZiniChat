'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { FacebookBadgeIcon as Facebook } from '@/components/BrandIcons';
import { 
  DollarSign, TrendingUp, BarChart3, Eye, MousePointer, 
  RefreshCw, Play, Pause, Edit2, Check, X, ChevronDown, 
  Sliders, Calendar, Share2, ThumbsUp, Trash2, ExternalLink, 
  ShieldCheck, AlertCircle, CheckCircle2, Sparkles, Filter, 
  ArrowUpRight, ArrowDownRight, Layers, Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdAccount {
  id: string;
  adAccountId: string;
  adAccountName: string;
  currency: string;
  status: string;
  connectedAt: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startTime: string;
  stopTime: string;
}

interface PagePost {
  id: string;
  message: string;
  createdTime: string;
  fullPicture: string | null;
  permalinkUrl: string | null;
  reactionsCount: number;
  sharesCount: number;
}

interface Insights {
  impressions: number;
  clicks: number;
  spend: number;
  cpc: number;
  ctr: number;
  reach: number;
  purchases: number;
  leads: number;
}

export default function MetaAdsManagerPage() {
  const { language } = useLanguage();
  const router = useRouter();

  // Navigation Tabs: 'campaigns' | 'boost' | 'accounts'
  const [activeTab, setActiveTab] = useState<'campaigns' | 'boost' | 'accounts'>('campaigns');

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [balance, setBalance] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);
  const [pageName, setPageName] = useState<string>('');
  const [pageId, setPageId] = useState<string>('');

  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inline Budget Edit State
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState<string>('');

  // Audience Targeting Modal State
  const [targetingModalOpen, setTargetingModalOpen] = useState(false);
  const [selectedCampaignForTargeting, setSelectedCampaignForTargeting] = useState<Campaign | null>(null);
  const [targetCountries, setTargetCountries] = useState<string>('BD');
  const [targetAgeMin, setTargetAgeMin] = useState<number>(18);
  const [targetAgeMax, setTargetAgeMax] = useState<number>(65);
  const [targetGender, setTargetGender] = useState<'all' | 'men' | 'women'>('all');

  // Boost Post Drawer/Modal State
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PagePost | null>(null);
  const [boostBudget, setBoostBudget] = useState<number>(500);
  const [boostDuration, setBoostDuration] = useState<number>(7);
  const [boostCountries, setBoostCountries] = useState<string>('BD');
  const [boostAgeMin, setBoostAgeMin] = useState<number>(18);
  const [boostAgeMax, setBoostAgeMax] = useState<number>(65);
  const [boostGender, setBoostGender] = useState<'all' | 'men' | 'women'>('all');
  const [launchingBoost, setLaunchingBoost] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchAccounts();

    // Handle OAuth Callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleOAuthCallback(code);
    }
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchAccountData(selectedAccountId);
      if (activeTab === 'boost') {
        fetchPagePosts(selectedAccountId);
      }
    }
  }, [selectedAccountId, activeTab]);

  const fetchAccounts = async () => {
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads-account/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data[0].adAccountId);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountData = async (accId: string) => {
    setLoadingCampaigns(true);
    const token = Cookies.get('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [balRes, campRes, insRes] = await Promise.all([
        fetch(`${API_URL}/meta-ads/balance/${accId}`, { headers }),
        fetch(`${API_URL}/meta-ads/campaigns/${accId}`, { headers }),
        fetch(`${API_URL}/meta-ads/insights/${accId}?datePreset=last_30d`, { headers }),
      ]);

      if (balRes.ok) setBalance(await balRes.json());
      if (campRes.ok) setCampaigns(await campRes.json());
      if (insRes.ok) setInsights(await insRes.json());
    } catch (err) {
      console.error('Error fetching account data:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchPagePosts = async (accId: string) => {
    setLoadingPosts(true);
    const token = Cookies.get('access_token');
    try {
      const res = await fetch(`${API_URL}/meta-ads/page-posts?adAccountId=${accId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPagePosts(data.posts || []);
        setPageName(data.pageName || '');
        setPageId(data.pageId || '');
      } else {
        const errData = await res.json();
        setStatusMsg({ type: 'error', message: errData.message || 'Failed to fetch page posts' });
      }
    } catch (err) {
      console.error('Error fetching page posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setConnecting(true);
    setStatusMsg(null);
    try {
      const token = Cookies.get('access_token');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      const res = await fetch(`${API_URL}/meta-ads-account/oauth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, redirectUri: cleanUrl })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to connect');
      }

      setStatusMsg({
        type: 'success',
        message: language === 'en' ? 'Meta Ad Account connected successfully.' : 'মেটা অ্যাড অ্যাকাউন্ট সফলভাবে সংযুক্ত হয়েছে।'
      });
      fetchAccounts();
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const token = Cookies.get('access_token');
      const redirectUri = window.location.origin + window.location.pathname;
      const res = await fetch(`${API_URL}/meta-ads-account/oauth/url?redirectUri=${encodeURIComponent(redirectUri)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to initiate connection');
      }

      const data = await res.json();
      window.location.href = data.url;
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Could not connect at this time.' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to disconnect this account?' : 'আপনি কি এই অ্যাকাউন্টটি ডিসকানেক্ট করতে চান?')) return;
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads-account/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAccounts(accounts.filter(a => a.id !== id));
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? 'Account disconnected.' : 'অ্যাকাউন্ট ডিসকানেক্ট করা হয়েছে।'
        });
        if (selectedAccountId === id) {
          const remaining = accounts.filter(a => a.id !== id);
          setSelectedAccountId(remaining[0]?.adAccountId || '');
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Error disconnecting account.' });
    }
  };

  // Toggle Campaign Status (ACTIVE / PAUSED)
  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setActionLoading(`status-${campaignId}`);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/objects/${campaignId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId, status: nextStatus })
      });

      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: nextStatus, effectiveStatus: nextStatus } : c));
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? `Campaign set to ${nextStatus}` : `ক্যাম্পেইন ${nextStatus === 'ACTIVE' ? 'সক্রিয়' : 'পজ'} করা হয়েছে`
        });
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update status');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Save Inline Daily Budget
  const handleSaveBudget = async (campaignId: string) => {
    const num = parseFloat(editBudgetValue);
    if (isNaN(num) || num <= 0) return;

    setActionLoading(`budget-${campaignId}`);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/objects/${campaignId}/budget`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId, newDailyBudget: num })
      });

      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, dailyBudget: num } : c));
        setEditingBudgetId(null);
        setStatusMsg({
          type: 'success',
          message: language === 'en' ? `Daily budget updated to ${num}` : `দৈনিক বাজেট ${num} এ আপডেট করা হয়েছে`
        });
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update budget');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // 1-Click Scale Budget by Percentage (+20%, +50%, -10%, -20%)
  const handleScaleBudget = async (campaignId: string, percentage: number) => {
    setActionLoading(`scale-${campaignId}-${percentage}`);
    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/objects/${campaignId}/scale`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adAccountId: selectedAccountId, percentage })
      });

      if (res.ok) {
        const data = await res.json();
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, dailyBudget: data.newDailyBudget } : c));
        setStatusMsg({
          type: 'success',
          message: language === 'en'
            ? `Budget scaled ${percentage > 0 ? '+' : ''}${percentage}% to ${data.newDailyBudget} ${balance?.currency || ''}`
            : `বাজেট ${percentage > 0 ? '+' : ''}${percentage}% স্কেল করে ${data.newDailyBudget} ${balance?.currency || ''} করা হয়েছে`
        });
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to scale budget');
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Open Boost Modal for a Post
  const handleOpenBoostModal = (post: PagePost) => {
    setSelectedPost(post);
    setBoostBudget(balance?.currency === 'BDT' ? 500 : 5);
    setBoostDuration(7);
    setBoostCountries('BD');
    setBoostAgeMin(18);
    setBoostAgeMax(65);
    setBoostGender('all');
    setBoostModalOpen(true);
  };

  // Launch Boost Ad for Page Post
  const handleLaunchBoost = async () => {
    if (!selectedPost) return;
    setLaunchingBoost(true);
    setStatusMsg(null);

    const genders = boostGender === 'men' ? [1] : boostGender === 'women' ? [2] : [1, 2];
    const countries = boostCountries.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

    try {
      const token = Cookies.get('access_token');
      const res = await fetch(`${API_URL}/meta-ads/boost-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          adAccountId: selectedAccountId,
          pagePostId: selectedPost.id,
          pageId: pageId,
          dailyBudget: boostBudget,
          durationDays: boostDuration,
          campaignName: `Boost: ${selectedPost.message.slice(0, 30) || 'Post'}`,
          targeting: {
            countries,
            ageMin: boostAgeMin,
            ageMax: boostAgeMax,
            genders,
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to launch ad');
      }

      setBoostModalOpen(false);
      setStatusMsg({
        type: 'success',
        message: language === 'en'
          ? 'Post boosted successfully! The ad is now active on Facebook.'
          : 'পোস্টটি সফলভাবে বুস্ট করা হয়েছে! বিজ্ঞাপনটি এখন ফেসবুকে সক্রিয়।'
      });
      setActiveTab('campaigns');
      fetchAccountData(selectedAccountId);
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message });
    } finally {
      setLaunchingBoost(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currencySymbol = balance?.currency === 'BDT' ? '৳' : balance?.currency === 'USD' ? '$' : balance?.currency || '';

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Facebook className="w-6 h-6 text-brand-green" />
            {language === 'en' ? 'Meta Ads Manager' : 'মেটা অ্যাডস ম্যানেজার'}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {language === 'en'
              ? 'Scale live campaigns, update daily pricing, and boost Facebook Page posts in 1 click.'
              : 'চলমান ক্যাম্পেইন স্কেল করুন, দৈনিক বাজেট পরিবর্তন করুন এবং ফেসবুক পেজের পোস্ট ১-ক্লিকে বুস্ট করুন।'}
          </p>
        </div>

        {/* Top Controls: Account Selector & Connect CTA */}
        <div className="flex flex-wrap items-center gap-2.5">
          {accounts.length > 0 && (
            <div className="relative">
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-surface/80 border border-white/10 text-white text-xs rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-brand-green appearance-none cursor-pointer"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.adAccountId} className="bg-slate-900 text-white">
                    {acc.adAccountName || 'Ad Account'} ({acc.adAccountId})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-secondary absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => {
              if (selectedAccountId) fetchAccountData(selectedAccountId);
              if (activeTab === 'boost' && selectedAccountId) fetchPagePosts(selectedAccountId);
            }}
            disabled={loadingCampaigns || loadingPosts}
            className="p-2 bg-surface/80 hover:bg-surface border border-white/10 text-text-secondary hover:text-white rounded-xl text-xs transition-colors flex items-center gap-1.5"
            title={language === 'en' ? 'Refresh Telemetry' : 'রিফ্রেশ করুন'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCampaigns || loadingPosts ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Facebook className="w-3.5 h-3.5" />
            {connecting
              ? (language === 'en' ? 'Connecting...' : 'কানেক্ট হচ্ছে...')
              : (language === 'en' ? 'Connect Account' : 'অ্যাকাউন্ট কানেক্ট')}
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMsg && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
          statusMsg.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMsg.message}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="opacity-70 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Account Balance & Telemetry Summary Cards */}
      {selectedAccountId && balance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 sm:p-4">
            <span className="text-[11px] text-text-secondary block mb-1">
              {language === 'en' ? 'Account Balance' : 'অ্যাকাউন্ট ব্যালেন্স'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-white">
                {currencySymbol} {balance.balance?.toFixed(2) || '0.00'}
              </span>
              <span className="text-[10px] text-text-secondary uppercase">{balance.currency}</span>
            </div>
          </div>

          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 sm:p-4">
            <span className="text-[11px] text-text-secondary block mb-1">
              {language === 'en' ? 'Total Spent (30d)' : 'গত ৩০ দিনের খরচ'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-brand-orange">
                {currencySymbol} {insights?.spend?.toFixed(2) || '0.00'}
              </span>
            </div>
          </div>

          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 sm:p-4">
            <span className="text-[11px] text-text-secondary block mb-1">
              {language === 'en' ? 'Clicks / CTR' : 'ক্লিক / CTR'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-brand-green">
                {insights?.clicks?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-text-secondary">({insights?.ctr?.toFixed(2) || '0.00'}%)</span>
            </div>
          </div>

          <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 sm:p-4">
            <span className="text-[11px] text-text-secondary block mb-1">
              {language === 'en' ? 'Total Impressions' : 'মোট ইমপ্রেশন'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-white">
                {insights?.impressions?.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation Pill Bar */}
      <div 
        className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          {language === 'en' ? 'Active Campaigns & Scale Hub' : 'ক্যাম্পেইন ও স্কেলিং হাব'}
          {campaigns.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
              {campaigns.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('boost')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'boost'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4 text-brand-orange" />
          {language === 'en' ? 'Boost Page Post' : 'পেইজ পোস্ট বুস্টিং'}
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20'
              : 'text-text-secondary hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          {language === 'en' ? 'Connected Accounts' : 'সংযুক্ত অ্যাকাউন্টস'}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACTIVE CAMPAIGNS & SCALE HUB */}
      {/* ========================================================================= */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center py-16">
              <Layers className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">
                {language === 'en' ? 'No Campaigns Found' : 'কোনো ক্যাম্পেইন পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto mb-5">
                {language === 'en'
                  ? 'There are no active or draft campaigns in this ad account yet. Boost a Facebook Page post to launch your first ad.'
                  : 'এই অ্যাড অ্যাকাউন্টে এখনো কোনো ক্যাম্পেইন নেই। প্রথম বিজ্ঞাপন চালাতে পেইজ পোস্ট বুস্ট করুন।'}
              </p>
              <button
                onClick={() => setActiveTab('boost')}
                className="px-4 py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-xs font-medium transition-colors inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {language === 'en' ? 'Boost a Page Post Now' : 'এখনই একটি পোস্ট বুস্ট করুন'}
              </button>
            </div>
          ) : (
            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {/* Desktop View Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-text-secondary uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Campaign Name' : 'ক্যাম্পেইনের নাম'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Objective' : 'উদ্দেশ্য'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Daily Budget' : 'দৈনিক বাজেট'}</th>
                      <th className="py-3 px-4 text-center">{language === 'en' ? '1-Click Scale' : '১-ক্লিক স্কেল'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {campaigns.map((camp) => {
                      const isActive = camp.status === 'ACTIVE';
                      const isStatusLoading = actionLoading === `status-${camp.id}`;
                      const isBudgetLoading = actionLoading === `budget-${camp.id}`;

                      return (
                        <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                          {/* Status Toggle Switch */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => toggleCampaignStatus(camp.id, camp.status)}
                              disabled={isStatusLoading}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isActive ? 'bg-brand-green' : 'bg-slate-700'
                              } ${isStatusLoading ? 'opacity-50' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  isActive ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="ml-2 text-[10px] uppercase font-mono text-text-secondary">
                              {isActive ? 'Active' : 'Paused'}
                            </span>
                          </td>

                          {/* Campaign Name */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-white max-w-[280px] truncate" title={camp.name}>
                              {camp.name}
                            </div>
                            <div className="text-[10px] text-text-secondary font-mono">ID: {camp.id}</div>
                          </td>

                          {/* Objective Badge */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {camp.objective || 'OUTCOME_ENGAGEMENT'}
                            </span>
                          </td>

                          {/* Daily Budget (Inline Editable) */}
                          <td className="py-3 px-4">
                            {editingBudgetId === camp.id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-text-secondary text-[11px]">{currencySymbol}</span>
                                <input
                                  type="number"
                                  value={editBudgetValue}
                                  onChange={(e) => setEditBudgetValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveBudget(camp.id);
                                    if (e.key === 'Escape') setEditingBudgetId(null);
                                  }}
                                  className="w-20 px-2 py-1 bg-surface border border-brand-green text-white text-xs rounded-lg focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveBudget(camp.id)}
                                  disabled={isBudgetLoading}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingBudgetId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-500/10 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <span className="font-semibold text-white">
                                  {camp.dailyBudget ? `${currencySymbol} ${camp.dailyBudget}` : '—'}
                                </span>
                                {camp.dailyBudget && (
                                  <button
                                    onClick={() => {
                                      setEditingBudgetId(camp.id);
                                      setEditBudgetValue(String(camp.dailyBudget));
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-text-secondary hover:text-white transition-opacity"
                                    title={language === 'en' ? 'Edit Daily Budget' : 'বাজেট পরিবর্তন করুন'}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 1-Click Scale Quick Buttons (+20%, +50%, -10%, -20%) */}
                          <td className="py-3 px-4">
                            {camp.dailyBudget ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleScaleBudget(camp.id, 20)}
                                  disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all flex items-center gap-0.5"
                                  title="Scale up by 20%"
                                >
                                  <ArrowUpRight className="w-3 h-3" /> +20%
                                </button>
                                <button
                                  onClick={() => handleScaleBudget(camp.id, 50)}
                                  disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all flex items-center gap-0.5"
                                  title="Scale up by 50%"
                                >
                                  <ArrowUpRight className="w-3 h-3" /> +50%
                                </button>
                                <button
                                  onClick={() => handleScaleBudget(camp.id, -10)}
                                  disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all flex items-center gap-0.5"
                                  title="Scale down by 10%"
                                >
                                  <ArrowDownRight className="w-3 h-3" /> -10%
                                </button>
                                <button
                                  onClick={() => handleScaleBudget(camp.id, -20)}
                                  disabled={actionLoading?.startsWith(`scale-${camp.id}`)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all flex items-center gap-0.5"
                                  title="Scale down by 20%"
                                >
                                  <ArrowDownRight className="w-3 h-3" /> -20%
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-text-secondary text-center block">
                                {language === 'en' ? 'Lifetime Budget' : 'লাইফটাইম বাজেট'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Native Card View (< 1024px) */}
              <div className="lg:hidden divide-y divide-white/5 p-3 space-y-3">
                {campaigns.map((camp) => {
                  const isActive = camp.status === 'ACTIVE';
                  const isStatusLoading = actionLoading === `status-${camp.id}`;

                  return (
                    <div key={camp.id} className="p-3 bg-surface-light rounded-xl space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-xs truncate">{camp.name}</h4>
                          <span className="text-[10px] font-mono text-text-secondary">ID: {camp.id}</span>
                        </div>
                        <button
                          onClick={() => toggleCampaignStatus(camp.id, camp.status)}
                          disabled={isStatusLoading}
                          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                            isActive ? 'bg-brand-green' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                        <span className="text-text-secondary">{language === 'en' ? 'Daily Budget:' : 'দৈনিক বাজেট:'}</span>
                        <span className="font-bold text-white">
                          {camp.dailyBudget ? `${currencySymbol} ${camp.dailyBudget}` : '—'}
                        </span>
                      </div>

                      {camp.dailyBudget && (
                        <div className="flex items-center justify-between gap-1 pt-2">
                          <button
                            onClick={() => handleScaleBudget(camp.id, 20)}
                            className="flex-1 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 text-center"
                          >
                            +20%
                          </button>
                          <button
                            onClick={() => handleScaleBudget(camp.id, 50)}
                            className="flex-1 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 text-center"
                          >
                            +50%
                          </button>
                          <button
                            onClick={() => handleScaleBudget(camp.id, -10)}
                            className="flex-1 py-1 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold border border-orange-500/20 text-center"
                          >
                            -10%
                          </button>
                          <button
                            onClick={() => handleScaleBudget(camp.id, -20)}
                            className="flex-1 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 text-center"
                          >
                            -20%
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BOOST PAGE POST */}
      {/* ========================================================================= */}
      {activeTab === 'boost' && (
        <div className="space-y-4">
          {/* Header notice */}
          <div className="bg-gradient-to-r from-brand-green/10 to-brand-orange/10 border border-brand-green/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                {pageName ? `${pageName} — ${language === 'en' ? 'Facebook Posts' : 'ফেসবুক পোস্টসমূহ'}` : (language === 'en' ? 'Facebook Page Posts' : 'ফেসবুক পেইজ পোস্টসমূহ')}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {language === 'en'
                  ? 'Select any existing Facebook Page post to boost. All organic likes, comments, and shares will be preserved.'
                  : 'বুস্ট করতে যেকোনো পোস্ট নির্বাচন করুন। পোস্টের পূর্বের সব লাইক, কমেন্ট ও শেয়ার হুবহু অক্ষত থাকবে।'}
              </p>
            </div>
            <button
              onClick={() => fetchPagePosts(selectedAccountId)}
              disabled={loadingPosts}
              className="px-3.5 py-1.5 bg-surface hover:bg-surface-hover border border-white/10 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPosts ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Fetch Latest Posts' : 'নতুন পোস্ট খুঁজুন'}
            </button>
          </div>

          {/* Posts Grid */}
          {loadingPosts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-surface/50 border border-white/5 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : pagePosts.length === 0 ? (
            <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center py-16">
              <Facebook className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">
                {language === 'en' ? 'No Posts Found on Connected Page' : 'কানেক্টেড পেইজে কোনো পোস্ট পাওয়া যায়নি'}
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto mb-4">
                {language === 'en'
                  ? 'Publish a post or photo on your Facebook Page, then click "Fetch Latest Posts" to boost it here.'
                  : 'আপনার ফেসবুক পেজে কোনো ছবি বা লেখা পোস্ট করুন, তারপর এখানে রিফ্রেশ করে ১-ক্লিকে বুস্ট করুন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pagePosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-surface/70 backdrop-blur-xl border border-white/10 hover:border-brand-green/50 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 group shadow-lg"
                >
                  {/* Post Image Thumbnail */}
                  <div className="h-44 bg-slate-900/50 relative overflow-hidden flex items-center justify-center">
                    {post.fullPicture ? (
                      <img
                        src={post.fullPicture}
                        alt="Post media"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Facebook className="w-8 h-8 text-text-secondary/40 mx-auto mb-1" />
                        <span className="text-[10px] text-text-secondary font-mono">Text Status Post</span>
                      </div>
                    )}
                    {post.permalinkUrl && (
                      <a
                        href={post.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="View on Facebook"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Post Text & Metrics */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] text-text-secondary font-mono block mb-1">
                        {new Date(post.createdTime).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <p className="text-xs text-white/90 line-clamp-3 leading-relaxed">
                        {post.message || (language === 'en' ? '[Photo Post without caption]' : '[ক্যাপশন ছাড়া ছবি পোস্ট]')}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3 text-blue-400" />
                          {post.reactionsCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="w-3 h-3 text-emerald-400" />
                          {post.sharesCount}
                        </span>
                      </div>

                      <button
                        onClick={() => handleOpenBoostModal(post)}
                        className="w-full py-2 bg-brand-green hover:bg-brand-green/90 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-brand-green/20"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                        {language === 'en' ? 'Boost This Post' : 'এই পোস্টটি বুস্ট করুন'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONNECTED ACCOUNTS & BALANCES */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="bg-surface/70 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-orange" />
              {language === 'en' ? 'Connected Meta Ad Accounts' : 'সংযুক্ত মেটা অ্যাড অ্যাকাউন্টসমূহ'}
            </h2>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-3 py-1.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Facebook className="w-3.5 h-3.5" />
              {language === 'en' ? 'Connect Another Account' : 'অন্য অ্যাকাউন্ট কানেক্ট করুন'}
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
              <Facebook className="w-10 h-10 text-text-secondary/40 mx-auto mb-2" />
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {language === 'en' ? 'No Meta Ad account connected yet.' : 'এখনো কোনো মেটা অ্যাড অ্যাকাউন্ট যুক্ত করা হয়নি।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    acc.adAccountId === selectedAccountId
                      ? 'bg-brand-green/10 border-brand-green/40 shadow-lg shadow-brand-green/10'
                      : 'bg-surface-light border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                        <Facebook className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-xs">{acc.adAccountName || 'Ad Account'}</h4>
                        <span className="text-[10px] font-mono text-text-secondary">act_{acc.adAccountId}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(acc.id)}
                      className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={language === 'en' ? 'Disconnect' : 'ডিসকানেক্ট'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-secondary pt-3 mt-3 border-t border-white/5">
                    <span>Currency: <strong className="text-white uppercase">{acc.currency || 'USD'}</strong></span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 font-medium">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1-CLICK BOOST POST MODAL / DRAWER */}
      {/* ========================================================================= */}
      {boostModalOpen && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                {language === 'en' ? 'Boost Existing Page Post' : 'পেইজ পোস্ট বুস্টিং সেটআপ'}
              </h3>
              <button
                onClick={() => setBoostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Post Preview Snippet */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex gap-3 items-center">
              {selectedPost.fullPicture && (
                <img
                  src={selectedPost.fullPicture}
                  alt="Post preview"
                  className="w-14 h-14 object-cover rounded-lg shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-emerald-400 font-mono block">
                  {language === 'en' ? '✓ Native Post (Likes/Shares Preserved)' : '✓ বিদ্যমান পোস্ট (লাইক/শেয়ার অক্ষত থাকবে)'}
                </span>
                <p className="text-xs text-white line-clamp-2 mt-0.5">{selectedPost.message || 'Post without text'}</p>
              </div>
            </div>

            {/* Daily Budget Selector */}
            <div className="space-y-2">
              <label className="text-xs text-text-secondary font-medium block">
                {language === 'en' ? 'Daily Budget:' : 'দৈনিক বাজেট:'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold">{currencySymbol}</span>
                <input
                  type="number"
                  value={boostBudget}
                  onChange={(e) => setBoostBudget(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-surface border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-green"
                />
              </div>

              {/* Quick Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(balance?.currency === 'BDT' ? [300, 500, 1000, 2000, 5000] : [5, 10, 25, 50, 100]).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBoostBudget(amt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                      boostBudget === amt
                        ? 'bg-brand-green text-white font-bold'
                        : 'bg-white/5 text-text-secondary hover:text-white'
                    }`}
                  >
                    {currencySymbol} {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{language === 'en' ? 'Duration:' : 'বিজ্ঞাপনের মেয়াদ:'}</span>
                <span className="text-white font-bold">{boostDuration} {language === 'en' ? 'Days' : 'দিন'}</span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                value={boostDuration}
                onChange={(e) => setBoostDuration(Number(e.target.value))}
                className="w-full accent-brand-green cursor-pointer"
              />
              <div className="text-[11px] text-text-secondary flex justify-between">
                <span>1 Day</span>
                <span>Total: ~{currencySymbol} {(boostBudget * boostDuration).toLocaleString()}</span>
                <span>30 Days</span>
              </div>
            </div>

            {/* Audience Targeting */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-brand-green" />
                {language === 'en' ? 'Target Audience' : 'টার্গেট অডিয়েন্স'}
              </span>

              {/* Country */}
              <div>
                <label className="text-[11px] text-text-secondary block mb-1">
                  {language === 'en' ? 'Country (e.g. BD, US, IN):' : 'টার্গেট দেশ:'}
                </label>
                <input
                  type="text"
                  value={boostCountries}
                  onChange={(e) => setBoostCountries(e.target.value)}
                  className="w-full bg-surface border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 uppercase font-mono focus:outline-none focus:border-brand-green"
                  placeholder="BD"
                />
              </div>

              {/* Age Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Min Age:</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={boostAgeMin}
                    onChange={(e) => setBoostAgeMin(Number(e.target.value))}
                    className="w-full bg-surface border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Max Age:</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={boostAgeMax}
                    onChange={(e) => setBoostAgeMax(Number(e.target.value))}
                    className="w-full bg-surface border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-[11px] text-text-secondary block mb-1.5">Gender:</label>
                <div className="flex items-center gap-2">
                  {(['all', 'men', 'women'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setBoostGender(g)}
                      className={`flex-1 py-1.5 rounded-xl text-xs capitalize transition-colors ${
                        boostGender === g
                          ? 'bg-brand-green text-white font-bold'
                          : 'bg-white/5 text-text-secondary hover:text-white'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBoostModalOpen(false)}
                className="px-4 py-2 text-xs text-text-secondary hover:text-white transition-colors"
              >
                {language === 'en' ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleLaunchBoost}
                disabled={launchingBoost}
                className="px-5 py-2.5 bg-brand-green hover:bg-brand-green/90 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-green/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                {launchingBoost
                  ? (language === 'en' ? 'Launching Ad on Meta...' : 'মেটাতে বিজ্ঞাপন লাইভ হচ্ছে...')
                  : (language === 'en' ? 'Launch Ad on Meta Now' : 'এখনই মেটাতে বিজ্ঞাপন লাইভ করুন')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
