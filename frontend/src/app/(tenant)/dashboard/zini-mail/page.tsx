'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';
import {
  Mail,
  Plus,
  Settings,
  Play,
  Pause,
  Eye,
  Trash2,
  HardDrive,
  Sparkles,
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Flame,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Globe,
  Share2,
  ArrowRight,
  ChevronRight,
  Layers,
  Zap
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ZiniMailDashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('ai_email_outreach');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Subscription Plan & AI Quota Synchronization
  const [quotaData, setQuotaData] = useState<{
    isSubscriptionActive?: boolean;
    aiQuota?: number;
    aiUsed?: number;
    allowByok?: boolean;
  } | null>(null);

  const isPlanActive = quotaData
    ? quotaData.isSubscriptionActive !== false
    : overview
    ? overview.isSubscriptionActive !== false
    : true;

  const isAiQuotaExhausted = Boolean(
    overview &&
    !overview.isByok &&
    overview.aiQuota !== undefined &&
    overview.aiQuota > 0 &&
    overview.aiUsed !== undefined &&
    overview.aiUsed >= overview.aiQuota
  );

  const fetchDashboardData = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, campaignsRes, quotasRes] = await Promise.all([
        fetch(`${API}/tenant/outreach/overview`, { headers }),
        fetch(`${API}/tenant/outreach/campaigns?limit=50`, { headers }),
        fetch(`${API}/billing/quotas`, { headers }).catch(() => null),
      ]);

      if (quotasRes && quotasRes.ok) {
        const qData = await quotasRes.json();
        setQuotaData({
          isSubscriptionActive: qData.isSubscriptionActive,
          aiQuota: qData.aiQuota,
          aiUsed: qData.aiUsed,
          allowByok: qData.allowByok,
        });
      }

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      }
      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err: any) {
      console.error('Failed to load Zini-Mail dashboard data', err);
      toast.error(
        language === 'en'
          ? 'Failed to load outreach campaigns'
          : 'ক্যাম্পেইনের তথ্য লোড করতে ব্যর্থ হয়েছে',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStartCampaign = async (campaignId: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to start campaigns.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন শুরু করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to start campaigns.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। ক্যাম্পেইন শুরু করতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }

    try {
      setActionLoadingId(campaignId);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start campaign');

      toast.success(
        language === 'en'
          ? 'Campaign started! Outreach email queue is active.'
          : 'ক্যাম্পেইন শুরু হয়েছে! কিউ চালু হয়েছে।',
      );
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error starting campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      setActionLoadingId(campaignId);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to pause campaign');

      toast.success(
        language === 'en' ? 'Campaign paused.' : 'ক্যাম্পেইন সাময়িকভাবে স্থগিত করা হয়েছে।',
      );
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error pausing campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to resume campaigns.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন পুনরায় চালু করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }
    if (isAiQuotaExhausted) {
      toast.error(
        language === 'en'
          ? 'AI Response Quota exhausted. Please upgrade your quota to resume campaigns.'
          : 'এআই রেসপন্স কোটা শেষ হয়েছে। ক্যাম্পেইন পুনরায় চালু করতে কোটা বৃদ্ধি করুন।'
      );
      return;
    }

    try {
      setActionLoadingId(campaignId);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resume campaign');

      toast.success(
        language === 'en' ? 'Campaign resumed!' : 'ক্যাম্পেইন পুনরায় চালু করা হয়েছে!',
      );
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error resuming campaign');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (
      !confirm(
        language === 'en'
          ? 'Are you sure you want to delete this campaign? All gathered leads will be deleted.'
          : 'আপনি কি নিশ্চিত যে এই ক্যাম্পেইনটি ডিলিট করতে চান? ক্যাম্পেইনের সব লিড মুছে যাবে।',
      )
    ) {
      return;
    }

    try {
      setDeletingId(campaignId);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete campaign');

      toast.success(
        language === 'en' ? 'Campaign deleted successfully.' : 'ক্যাম্পেইন সফলভাবে ডিলিট করা হয়েছে।',
      );
      fetchDashboardData();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting campaign');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper formatting for bytes
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isFeatureLoading || loading) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-surface-hover rounded-lg" />
              <div className="h-4 w-72 bg-surface-hover/70 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 bg-surface-hover rounded-xl" />
              <div className="h-9 w-32 bg-[#1F824A]/30 rounded-xl" />
            </div>
          </div>
          <div className="h-7 w-full bg-surface-hover/40 rounded-xl" />
        </div>

        {/* 6 KPI Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface/70 border border-border rounded-2xl p-3.5 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-surface-hover rounded" />
              <div className="h-6 w-12 bg-surface-hover rounded" />
              <div className="h-2.5 w-20 bg-surface-hover/60 rounded" />
            </div>
          ))}
        </div>

        {/* Campaign List Skeleton */}
        <div className="bg-surface/70 border border-border rounded-2xl p-4 shadow-sm space-y-3 animate-pulse">
          <div className="h-8 w-60 bg-surface-hover rounded-xl" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-hover/50 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Feature Rollout Isolation Check
  if (!isFeatureEnabled) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {language === 'en' ? 'Feature Not Available' : 'ফিচারটি সক্রিয় নয়'}
          </h2>
          <p className="text-[13px] text-muted-foreground max-w-md mx-auto">
            {language === 'en'
              ? 'Zini-Mail Autonomous AI Cold Email Outreach is currently under active beta. Contact support or your administrator to unlock this feature for your plan.'
              : 'জিনি-মেইল স্বয়ংক্রিয় এআই আউটরিচ বর্তমানে বেটা টেস্টিংয়ে রয়েছে। আপনার প্যাকেজে এই সুবিধা আনলক করতে অ্যাডমিনের সাথে যোগাযোগ করুন।'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header Banner */}
      <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/80 dark:border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1F824A]/10 text-[#1F824A] border border-[#1F824A]/30">
                {language === 'en' ? 'AI Auto Email' : 'স্মার্ট ইমেইল অটোমেশন'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {language === 'en' ? 'Safe Sending 1/min' : 'নিরাপদ সেন্ডিং ১/মিনিট'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                {language === 'en' ? '0 Quota on Organic CDN' : 'জিরো স্টোরেজ কোটা'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#1F824A] shrink-0" />
              {language === 'en'
                ? 'AI Automated Email Marketing'
                : 'এআই দিয়ে অটো ইমেইল মার্কেটিং'}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground max-w-2xl leading-relaxed">
              {language === 'en'
                ? 'Automatically find potential customers, generate personalized marketing emails with AI from your banner, send safely via your connected email/SMTP, and track real customer orders.'
                : 'টার্গেট কাস্টমারদের খুঁজে বের করুন, ব্যানার দেখে এআই আকর্ষণীয় অফার ইমেইল তৈরি করবে, নিরাপদে কাস্টমারদের কাছে পৌঁছে যাবে এবং সরাসরি অর্ডার পাবেন।'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <Link
              href="/dashboard/zini-mail/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium rounded-xl border border-border/80 dark:border-zinc-800 bg-surface dark:bg-zinc-900/60 hover:bg-surface-hover text-foreground transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              {language === 'en' ? 'SMTP Settings' : 'ইমেইল / এসএমটিপি সেটিংস'}
            </Link>

            {isPlanActive ? (
              <Link
                href="/dashboard/zini-mail/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl bg-[#1F824A] hover:bg-[#1F824A]/90 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {language === 'en' ? 'New Campaign' : 'নতুন ক্যাম্পেইন তৈরি'}
              </Link>
            ) : (
              <button
                onClick={() => {
                  toast.error(
                    language === 'en'
                      ? 'Subscription plan expired. Please renew your plan to create campaigns.'
                      : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। নতুন ক্যাম্পেইন তৈরি করতে প্ল্যান রিনিউ করুন।'
                  );
                  router.push('/dashboard/settings/subscription');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl bg-surface-hover/70 text-muted-foreground border border-border/80 cursor-not-allowed shadow-sm"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                {language === 'en' ? 'New Campaign (Locked)' : 'নতুন ক্যাম্পেইন (লক)'}
              </button>
            )}
          </div>
        </div>

        {/* 3-Step Simple Explainer Card (সহজ ৩টি ধাপে অটো ইমেইল মার্কেটিং) */}
        <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-zinc-800/40 border border-border/60 dark:border-zinc-800/80">
          <div className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1F824A]" />
            <span>{language === 'en' ? 'How AI Auto Email Marketing Works (3 Simple Steps):' : 'এআই অটো ইমেইল মার্কেটিং কিভাবে কাজ করে (সহজ ৩টি ধাপ):'}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-surface/70 dark:bg-zinc-900/50 border border-border/40 dark:border-zinc-800/60">
              <span className="w-5 h-5 rounded-full bg-[#1F824A]/10 text-[#1F824A] font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
              <div>
                <strong className="text-foreground block">{language === 'en' ? '1. Target Audience' : '১. টার্গেট কাস্টমার নির্বাচন'}</strong>
                <span className="text-muted-foreground text-[10px]">{language === 'en' ? 'Select city, country & niche keywords.' : 'আপনার কাঙ্ক্ষিত শহর বা ক্যাটাগরি বেছে নিন।'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-surface/70 dark:bg-zinc-900/50 border border-border/40 dark:border-zinc-800/60">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
              <div>
                <strong className="text-foreground block">{language === 'en' ? '2. AI Auto-Drafts Copy' : '২. এআই দিয়ে অটো কনটেন্ট'}</strong>
                <span className="text-muted-foreground text-[10px]">{language === 'en' ? 'AI analyzes your banner and writes the offer email.' : 'অফার ব্যানার দেখে এআই আকর্ষণীয় ইমেইল লিখে দেয়।'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-surface/70 dark:bg-zinc-900/50 border border-border/40 dark:border-zinc-800/60">
              <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
              <div>
                <strong className="text-foreground block">{language === 'en' ? '3. Safe Sending & Orders' : '৩. নিরাপদ সেন্ডিং ও অর্ডার'}</strong>
                <span className="text-muted-foreground text-[10px]">{language === 'en' ? 'Safe 1/min delivery; tracks opens, clicks and orders.' : 'প্রতি মিনিটে ১টি করে ইমেইল যায় ও সরাসরি সেলস আসে।'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Quota Bar (Rule 4 compliant: AI Response Quota, NOT fake 999999) */}
        <div className="pt-2 border-t border-border/60 dark:border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-[12px]">
          {/* AI Response Quota Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="font-semibold">
              {language === 'en' ? 'Available AI Response Quota:' : 'অবশিষ্ট এআই রেসপন্স কোটা:'}
            </span>
            <span className="font-bold text-sm text-foreground">
              {overview?.availableAiCredits === -1
                ? (language === 'en' ? 'Unlimited' : 'আনলিমিটেড')
                : (overview?.availableAiCredits ?? 0).toLocaleString()}
            </span>
            {overview?.aiQuota && overview.aiQuota !== -1 && (
              <span className="text-[11px] text-muted-foreground font-normal">
                / {overview.aiQuota.toLocaleString()} {language === 'en' ? 'Total' : 'মোট'}
              </span>
            )}
            {overview?.aiUsed !== undefined && overview.aiUsed > 0 && (
              <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium">
                ({overview.aiUsed.toLocaleString()} {language === 'en' ? 'used' : 'ব্যবহৃত'})
              </span>
            )}
            <span className="hidden sm:inline-block text-[10px] text-muted-foreground pl-1 border-l border-purple-500/30">
              {language === 'en' ? 'Dedicated pool (no message quota deduction)' : 'মেসেজ কোটা থেকে সম্পূর্ণ আলাদা'}
            </span>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-border/60 dark:border-zinc-800"
            title={language === 'en' ? 'Refresh data' : 'রিফ্রেশ করুন'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Plan Expired Warning Banner */}
      {!isPlanActive && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-rose-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl mt-0.5 border border-rose-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                {language === 'en' ? '⚠️ Subscription Plan Expired — Zini-Mail Outreach Locked' : '⚠️ সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ — জিনি-মেইল আউটরিচ লকড'}
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'Your subscription plan has expired. Cold email dispatching, lead harvesting, and campaign creation are temporarily locked. Renew or reactivate your subscription to resume automated email outreach.'
                  : 'আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়ে গেছে। স্বয়ংক্রিয় কোল্ড ইমেইল পাঠানো, লিড সংগ্রহ এবং নতুন ক্যাম্পেইন তৈরি লক করা হয়েছে। ইমেইল আউটরিচ পুনরায় চালু করতে এখনই প্ল্যান রিনিউ করুন।'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings/subscription')}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-rose-900/40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Zap className="w-4 h-4 fill-white" />
            {language === 'en' ? 'Renew Plan Now' : 'প্ল্যান রিনিউ করুন'}
          </button>
        </div>
      )}

      {/* AI Quota Exhausted Warning Banner */}
      {isPlanActive && isAiQuotaExhausted && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl mt-0.5 border border-amber-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                {language === 'en' ? '⚡ AI Response Quota Exhausted' : '⚡ এআই রেসপন্স কোটা শেষ'}
              </h3>
              <p className="text-xs text-amber-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'You have consumed 100% of your AI response units for this billing period. AI email copy generation and auto-drafting from banners are paused until your next cycle or quota add-on upgrade.'
                  : 'আপনার চলতি বিলিং সাইকেলের এআই রেসপন্স কোটা সম্পূর্ণ শেষ হয়েছে। পরবর্তী সাইকেল বা কোটা বৃদ্ধির আগ পর্যন্ত ব্যানার থেকে এআই ইমেইল কনটেন্ট তৈরি সাময়িকভাবে স্থগিত থাকবে।'}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/settings/subscription')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-amber-900/40 flex items-center gap-2 shrink-0 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            {language === 'en' ? 'Upgrade AI Quota' : 'কোটা বৃদ্ধি করুন'}
          </button>
        </div>
      )}

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Campaigns */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Campaigns' : 'ক্যাম্পেইন'}</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalCampaigns ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {overview?.activeCampaigns ?? 0} {language === 'en' ? 'running' : 'চলমান'}
          </div>
        </div>

        {/* Emails Sent */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Emails Sent' : 'মেইল পাঠানো'}</span>
            <Mail className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalSent ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === 'en' ? 'Throttled 1/min' : 'নিরাপদ ১/মিনিট'}
          </div>
        </div>

        {/* Unique Opens */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Unique Opens' : 'ওপেন করেছে'}</span>
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalOpens ?? 0}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
            {overview?.openRatePercent ?? 0}% {language === 'en' ? 'open rate' : 'ওপেন হার'}
          </div>
        </div>

        {/* Unique Clicks */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Banner Clicks' : 'ক্লিক করেছে'}</span>
            <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalClicks ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
            {overview?.clickRatePercent ?? 0}% {language === 'en' ? 'click rate' : 'ক্লিক হার'}
          </div>
        </div>

        {/* 🔥 Clicked (No Order Yet) Highlight Card */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-3.5 shadow-sm space-y-1 relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>{language === 'en' ? 'Hot Clickers' : 'হট লিড'}</span>
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {overview?.totalClickedNoOrder ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {language === 'en' ? 'Clicked (No Order)' : 'ক্লিক করেছে, অর্ডার বাকি'}
          </div>
        </div>

        {/* Orders & Revenue */}
        <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Attributed Sales' : 'অর্ডার ও বিক্রয়'}</span>
            <ShoppingBag className="w-3.5 h-3.5 text-[#1F824A]" />
          </div>
          <div className="text-xl font-bold text-[#1F824A]">
            ৳{(overview?.totalRevenue || 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {overview?.totalOrders ?? 0} {language === 'en' ? 'orders closed' : 'টি অর্ডার'}
          </div>
        </div>
      </div>

      {/* Campaigns Table Section */}
      <div className="bg-surface/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/70 dark:border-zinc-800/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls (Responsive Search & Filter Pills) */}
        <div className="p-4 border-b border-border/70 dark:border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={
                  language === 'en'
                    ? 'Search campaigns by name...'
                    : 'ক্যাম্পেইনের নাম দিয়ে খুঁজুন...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[12px] rounded-xl bg-surface dark:bg-zinc-900/60 border border-border dark:border-zinc-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1F824A] focus:ring-1 focus:ring-[#1F824A]"
              />
            </div>
          </div>

          {/* Interactive Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', labelEn: 'All', labelBn: 'সকল', count: campaigns.length },
              { id: 'running', labelEn: 'Running', labelBn: 'চলমান', count: campaigns.filter(c => c.status === 'running').length },
              { id: 'paused', labelEn: 'Paused', labelBn: 'স্থগিত', count: campaigns.filter(c => c.status === 'paused').length },
              { id: 'completed', labelEn: 'Completed', labelBn: 'সম্পন্ন', count: campaigns.filter(c => c.status === 'completed').length },
              { id: 'draft', labelEn: 'Draft', labelBn: 'খসড়া', count: campaigns.filter(c => c.status === 'draft').length },
            ].map((pill) => {
              const active = statusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 border ${
                    active
                      ? 'bg-[#1F824A] text-white border-[#1F824A] shadow-sm'
                      : 'bg-surface dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground border-border dark:border-zinc-800 hover:border-[#1F824A]/40'
                  }`}
                >
                  <span>{language === 'en' ? pill.labelEn : pill.labelBn}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-surface-hover text-muted-foreground'
                  }`}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Body */}
        {filteredCampaigns.length === 0 ? (
          <div className="p-8 sm:p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1F824A]/10 border border-[#1F824A]/20 flex items-center justify-center mx-auto text-[#1F824A]">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                {language === 'en' ? 'No Campaigns Found' : 'কোনো ক্যাম্পেইন পাওয়া যায়নি'}
              </h3>
              <p className="text-[12px] sm:text-[13px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                {language === 'en'
                  ? 'Create your first AI Email Marketing campaign to reach prospective customers and generate new sales.'
                  : 'আপনার প্রথম এআই অটো ইমেইল মার্কেটিং ক্যাম্পেইন তৈরি করে নতুন কাস্টমারদের কাছে পৌঁছান ও সরাসরি বিক্রি বাড়ান।'}
              </p>
            </div>
            {isPlanActive ? (
              <Link
                href="/dashboard/zini-mail/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-bold rounded-xl bg-[#1F824A] hover:bg-[#1F824A]/90 text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                {language === 'en' ? 'Create First Campaign' : 'নতুন ক্যাম্পেইন তৈরি করুন'}
              </Link>
            ) : (
              <button
                onClick={() => {
                  toast.error(
                    language === 'en'
                      ? 'Subscription plan expired. Please renew your plan to create campaigns.'
                      : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। নতুন ক্যাম্পেইন তৈরি করতে প্ল্যান রিনিউ করুন।'
                  );
                  router.push('/dashboard/settings/subscription');
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[12px] font-bold rounded-xl bg-surface-hover/70 text-muted-foreground border border-border/80 cursor-not-allowed shadow-md"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                {language === 'en' ? 'Create First Campaign (Locked)' : 'নতুন ক্যাম্পেইন (লক)'}
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Mobile View: High-density Glassmorphic Cards (Rule 3) */}
            <div className="md:hidden p-3 space-y-3">
              {filteredCampaigns.map((c) => {
                const isActionLoading = actionLoadingId === c.id;
                const isDeleting = deletingId === c.id;
                const progressPercent = c.totalLimit > 0
                  ? Math.min(100, Math.round((c.sentCount / c.totalLimit) * 100))
                  : 0;

                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-surface/80 dark:bg-zinc-900/50 border border-border/80 dark:border-zinc-800/80 shadow-sm space-y-3">
                    {/* Header Row: Title + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <Link
                          href={`/dashboard/zini-mail/${c.id}`}
                          className="font-bold text-[13px] text-foreground hover:text-[#1F824A] transition-colors flex items-center gap-1"
                        >
                          <span className="truncate">{c.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                        <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                          <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            {(c.channels || []).map((ch: string) => (
                              <span
                                key={ch}
                                className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-muted dark:bg-zinc-800 text-muted-foreground border border-border/60 dark:border-zinc-700/60"
                              >
                                {ch}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                          c.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse'
                            : c.status === 'paused'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : c.status === 'completed'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/30'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {language === 'en' ? 'Sent:' : 'পাঠানো:'}{' '}
                          <strong className="text-foreground">{c.sentCount}</strong> / {c.totalLimit}
                        </span>
                        <span className="font-bold text-foreground">{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-muted dark:bg-zinc-800 rounded-full h-2 overflow-hidden border border-border/40 dark:border-zinc-700/40">
                        <div
                          className="bg-[#1F824A] h-full transition-all rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics 4-Grid */}
                    <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-muted/30 dark:bg-zinc-800/30 border border-border/60 dark:border-zinc-800/80 text-center">
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">
                          {language === 'en' ? 'Opens' : 'ওপেন'}
                        </span>
                        <span className="text-[12px] font-bold text-foreground block">{c.opensCount}</span>
                        <span className="text-[9px] text-muted-foreground block">
                          {c.sentCount > 0 ? ((c.opensCount / c.sentCount) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground block">
                          {language === 'en' ? 'Clicks' : 'ক্লিক'}
                        </span>
                        <span className="text-[12px] font-bold text-foreground block">{c.clicksCount}</span>
                        <span className="text-[9px] text-muted-foreground block">
                          {c.sentCount > 0 ? ((c.clicksCount / c.sentCount) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-amber-600 dark:text-amber-400 font-bold block flex items-center justify-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-amber-500" />
                          {language === 'en' ? 'Hot' : 'হট'}
                        </span>
                        <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400 block">{c.clickedNoOrderCount ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-[#1F824A] font-bold block">
                          {language === 'en' ? 'Sales' : 'বিক্রয়'}
                        </span>
                        <span className="text-[12px] font-bold text-[#1F824A] block truncate">
                          ৳{Number(c.revenueGenerated || 0).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-muted-foreground block">
                          {c.ordersCount} {language === 'en' ? 'orders' : 'অর্ডার'}
                        </span>
                      </div>
                    </div>

                    {/* Single-line Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Link
                        href={`/dashboard/zini-mail/${c.id}`}
                        className="flex-1 min-h-[38px] py-1.5 px-3 rounded-xl bg-surface dark:bg-zinc-800/80 border border-border dark:border-zinc-700 hover:bg-surface-hover text-foreground font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}</span>
                      </Link>

                      {c.status === 'running' ? (
                        <button
                          onClick={() => handlePauseCampaign(c.id)}
                          disabled={isActionLoading}
                          className="min-h-[38px] py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 shadow-sm"
                        >
                          {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                          <span>{language === 'en' ? 'Pause' : 'স্থগিত'}</span>
                        </button>
                      ) : c.status === 'paused' ? (
                        <button
                          onClick={() => handleResumeCampaign(c.id)}
                          disabled={isActionLoading}
                          className="min-h-[38px] py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 shadow-sm"
                        >
                          {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{language === 'en' ? 'Resume' : 'চালু করুন'}</span>
                        </button>
                      ) : c.status === 'draft' ? (
                        <button
                          onClick={() => handleStartCampaign(c.id)}
                          disabled={isActionLoading}
                          className="min-h-[38px] py-1.5 px-3 rounded-xl bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 shadow-sm"
                        >
                          {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          <span>{language === 'en' ? 'Launch' : 'শুরু করুন'}</span>
                        </button>
                      ) : null}

                      {c.status !== 'running' && (
                        <button
                          onClick={() => handleDeleteCampaign(c.id)}
                          disabled={isDeleting}
                          className="min-h-[38px] px-2.5 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border border-border dark:border-zinc-800 transition-colors disabled:opacity-60"
                          title={language === 'en' ? 'Delete' : 'মুছে ফেলুন'}
                        >
                          {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/40 dark:bg-zinc-800/40 border-b border-border/80 dark:border-zinc-800 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">{language === 'en' ? 'Campaign' : 'ক্যাম্পেইন'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Status' : 'অবস্থা'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Progress' : 'অগ্রগতি'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Opens' : 'ওপেন'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Clicks' : 'ক্লিক'}</th>
                    <th className="py-3 px-3">{language === 'en' ? '🔥 Clicked (No Order)' : '🔥 ক্লিক (বাকি)'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Sales / Revenue' : 'বিক্রয়'}</th>
                    <th className="py-3 px-4 text-right">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 dark:divide-zinc-800/60">
                  {filteredCampaigns.map((c) => {
                    const isActionLoading = actionLoadingId === c.id;
                    const isDeleting = deletingId === c.id;

                    const progressPercent = c.totalLimit > 0
                      ? Math.min(100, Math.round((c.sentCount / c.totalLimit) * 100))
                      : 0;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-muted/30 dark:hover:bg-zinc-800/30 transition-colors group"
                      >
                        {/* Name & Channel */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <Link
                              href={`/dashboard/zini-mail/${c.id}`}
                              className="font-bold text-foreground hover:text-[#1F824A] transition-colors flex items-center gap-1.5"
                            >
                              {c.name}
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.createdAt).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-muted-foreground/40">•</span>
                              <div className="flex items-center gap-1">
                                {(c.channels || []).map((ch: string) => (
                                  <span
                                    key={ch}
                                    className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-muted dark:bg-zinc-800 text-muted-foreground border border-border/60 dark:border-zinc-700/60"
                                  >
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.status === 'running'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 animate-pulse'
                                : c.status === 'paused'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : c.status === 'completed'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/30'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {c.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1 w-28">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{c.sentCount} sent</span>
                              <span className="font-semibold text-foreground">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-muted dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-border/40 dark:border-zinc-700/40">
                              <div
                                className="bg-[#1F824A] h-full transition-all"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="text-[9px] text-muted-foreground/70">
                              Limit: {c.totalLimit}
                            </div>
                          </div>
                        </td>

                        {/* Opens */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-foreground">
                            {c.opensCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.sentCount > 0 ? ((c.opensCount / c.sentCount) * 100).toFixed(1) : 0}%
                          </div>
                        </td>

                        {/* Clicks */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-foreground">
                            {c.clicksCount}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.sentCount > 0 ? ((c.clicksCount / c.sentCount) * 100).toFixed(1) : 0}%
                          </div>
                        </td>

                        {/* 🔥 Clicked No Order */}
                        <td className="py-3.5 px-3">
                          <Link
                            href={`/dashboard/zini-mail/${c.id}?filter=clicked_no_order`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                          >
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            <span>{c.clickedNoOrderCount ?? 0}</span>
                          </Link>
                        </td>

                        {/* Orders & Revenue */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#1F824A]">
                            ৳{Number(c.revenueGenerated || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {c.ordersCount} {language === 'en' ? 'orders' : 'অর্ডার'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'running' ? (
                              <button
                                onClick={() => handlePauseCampaign(c.id)}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors border border-border dark:border-zinc-800 disabled:opacity-60"
                                title={language === 'en' ? 'Pause' : 'স্থগিত করুন'}
                              >
                                {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />}
                              </button>
                            ) : c.status === 'paused' ? (
                              <button
                                onClick={() => handleResumeCampaign(c.id)}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-border dark:border-zinc-800 disabled:opacity-60"
                                title={language === 'en' ? 'Resume' : 'চালু করুন'}
                              >
                                {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            ) : c.status === 'draft' ? (
                              <button
                                onClick={() => handleStartCampaign(c.id)}
                                disabled={isActionLoading}
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-border dark:border-zinc-800 disabled:opacity-60"
                                title={language === 'en' ? 'Launch' : 'ক্যাম্পেইন শুরু করুন'}
                              >
                                {isActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                            ) : null}

                            <Link
                              href={`/dashboard/zini-mail/${c.id}`}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-border dark:border-zinc-800"
                              title={language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {c.status !== 'running' && (
                              <button
                                onClick={() => handleDeleteCampaign(c.id)}
                                disabled={isDeleting}
                                className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors border border-border dark:border-zinc-800 disabled:opacity-60"
                                title={language === 'en' ? 'Delete' : 'মুছে ফেলুন'}
                              >
                                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
