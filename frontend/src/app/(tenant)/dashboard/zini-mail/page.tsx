'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
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
  Layers
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ZiniMailDashboardPage() {
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

  const fetchDashboardData = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [overviewRes, campaignsRes] = await Promise.all([
        fetch(`${API}/tenant/outreach/overview`, { headers }),
        fetch(`${API}/tenant/outreach/campaigns?limit=50`, { headers }),
      ]);

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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-28 bg-surface/70 backdrop-blur-xl rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface/70 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-surface/70 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Feature Rollout Isolation Check
  if (!isFeatureEnabled) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-8 text-center space-y-4">
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
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1F824A]/10 text-[#1F824A] border border-[#1F824A]/20">
                Zini-Mail Engine v1.2
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                PRO OUTREACH
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#1F824A]" />
              {language === 'en'
                ? 'Autonomous AI Cold Email Outreach'
                : 'স্বয়ংক্রিয় এআই কোল্ড ইমেইল আউটরিচ'}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-muted-foreground max-w-2xl">
              {language === 'en'
                ? 'Discover multi-channel B2B prospects, draft personalized emails with Gemini AI Vision, and track conversions down to orders and revenue.'
                : 'ফেসবুক ও ইনস্টাগ্রাম থেকে লিড সংগ্রহ করুন, এআই ভিশন দিয়ে আকর্ষণীয় ইমেইল পাঠান এবং সরাসরি অর্ডার ও সেলস ট্র্যাক করুন।'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/zini-mail/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium rounded-xl border border-surface-hover bg-surface hover:bg-surface-hover text-foreground transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              {language === 'en' ? 'SMTP Settings' : 'এসএমটিপি সেটিংস'}
            </Link>

            <Link
              href="/dashboard/zini-mail/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl bg-[#1F824A] hover:bg-[#1F824A]/90 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              {language === 'en' ? 'New Campaign' : 'নতুন ক্যাম্পেইন'}
            </Link>
          </div>
        </div>

        {/* Live Badges Bar */}
        <div className="mt-5 pt-4 border-t border-surface-hover/60 flex flex-wrap items-center justify-between gap-3 text-[11px] sm:text-[12px]">
          {/* AI Credits Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="font-medium">
              {language === 'en' ? 'Available AI Credits:' : 'অবশিষ্ট এআই ক্রেডিট:'}
            </span>
            <span className="font-bold">{overview?.availableAiCredits ?? 0}</span>
          </div>

          {/* Storage Meter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <HardDrive className="w-4 h-4 text-[#EE8D27]" />
              <span>
                {language === 'en' ? 'Storage Consumed:' : 'স্টোরেজ ব্যবহার:'}
              </span>
              <span className="font-bold text-foreground">
                {formatBytes(overview?.storageUsedBytes || 0)} / {formatBytes(overview?.storageLimitBytes || 524288000)}
              </span>
            </div>
            <div className="w-24 sm:w-32 bg-surface-hover rounded-full h-2 overflow-hidden border border-surface-hover">
              <div
                className={`h-full transition-all ${
                  (overview?.storageUsedPercent || 0) > 85
                    ? 'bg-rose-500'
                    : (overview?.storageUsedPercent || 0) > 65
                    ? 'bg-amber-500'
                    : 'bg-[#1F824A]'
                }`}
                style={{ width: `${Math.min(100, overview?.storageUsedPercent || 0)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground">
              {overview?.storageUsedPercent || 0}%
            </span>
          </div>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            title={language === 'en' ? 'Refresh data' : 'রিফ্রেশ করুন'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Campaigns */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-3.5 shadow-sm space-y-1">
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-3.5 shadow-sm space-y-1">
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Unique Opens' : 'ওপেন করেছে'}</span>
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalOpens ?? 0}
          </div>
          <div className="text-[10px] text-indigo-500 font-semibold">
            {overview?.openRatePercent ?? 0}% {language === 'en' ? 'open rate' : 'ওপেন হার'}
          </div>
        </div>

        {/* Unique Clicks */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-3.5 shadow-sm space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
            <span>{language === 'en' ? 'Banner Clicks' : 'ক্লিক করেছে'}</span>
            <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {overview?.totalClicks ?? 0}
          </div>
          <div className="text-[10px] text-amber-500 font-semibold">
            {overview?.clickRatePercent ?? 0}% {language === 'en' ? 'click rate' : 'ক্লিক হার'}
          </div>
        </div>

        {/* 🔥 Clicked (No Order Yet) Highlight Card */}
        <div className="bg-surface/70 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3.5 shadow-sm space-y-1 relative overflow-hidden bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="text-[11px] font-bold text-amber-500 flex items-center justify-between">
            <span>{language === 'en' ? 'Hot Clickers' : 'হট লিড'}</span>
            <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-amber-500">
            {overview?.totalClickedNoOrder ?? 0}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {language === 'en' ? 'Clicked (No Order)' : 'ক্লিক করেছে, অর্ডার বাকি'}
          </div>
        </div>

        {/* Orders & Revenue */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-3.5 shadow-sm space-y-1">
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
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                className="w-full pl-9 pr-3 py-1.5 text-[12px] rounded-xl bg-surface border border-surface-hover text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1F824A]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-[12px] rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
            >
              <option value="all">{language === 'en' ? 'All Status' : 'সব স্ট্যাটাস'}</option>
              <option value="running">{language === 'en' ? 'Running' : 'চলমান'}</option>
              <option value="paused">{language === 'en' ? 'Paused' : 'স্থগিত'}</option>
              <option value="completed">{language === 'en' ? 'Completed' : 'সম্পন্ন'}</option>
              <option value="draft">{language === 'en' ? 'Draft' : 'খসড়া'}</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-surface-hover/70 flex items-center justify-center mx-auto text-muted-foreground">
              <Mail className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {language === 'en' ? 'No Campaigns Found' : 'কোনো ক্যাম্পেইন পাওয়া যায়নি'}
              </h3>
              <p className="text-[12px] text-muted-foreground max-w-sm mx-auto">
                {language === 'en'
                  ? 'Launch your first autonomous AI outreach campaign to discover verified leads and generate sales.'
                  : 'আপনার প্রথম এআই কোল্ড ইমেইল ক্যাম্পেইন শুরু করুন এবং নতুন কাস্টমারদের কাছে পৌঁছান।'}
              </p>
            </div>
            <Link
              href="/dashboard/zini-mail/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl bg-[#1F824A] hover:bg-[#1F824A]/90 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              {language === 'en' ? 'Create Campaign' : 'ক্যাম্পেইন তৈরি করুন'}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface/50 border-b border-surface-hover text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
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
              <tbody className="divide-y divide-surface-hover/60">
                {filteredCampaigns.map((c) => {
                  const isActionLoading = actionLoadingId === c.id;
                  const isDeleting = deletingId === c.id;

                  const progressPercent = c.totalLimit > 0
                    ? Math.min(100, Math.round((c.sentCount / c.totalLimit) * 100))
                    : 0;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-hover/30 transition-colors group"
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
                                  className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-surface-hover text-muted-foreground border border-surface-hover"
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
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === 'running'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                              : c.status === 'paused'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : c.status === 'completed'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
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
                          <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
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
                              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors border border-surface-hover"
                              title={language === 'en' ? 'Pause' : 'স্থগিত করুন'}
                            >
                              <Pause className="w-3.5 h-3.5" />
                            </button>
                          ) : c.status === 'paused' ? (
                            <button
                              onClick={() => handleResumeCampaign(c.id)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors border border-surface-hover"
                              title={language === 'en' ? 'Resume' : 'চালু করুন'}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          ) : c.status === 'draft' ? (
                            <button
                              onClick={() => handleStartCampaign(c.id)}
                              disabled={isActionLoading}
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors border border-surface-hover"
                              title={language === 'en' ? 'Launch' : 'ক্যাম্পেইন শুরু করুন'}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          ) : null}

                          <Link
                            href={`/dashboard/zini-mail/${c.id}`}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border border-surface-hover"
                            title={language === 'en' ? 'View Details' : 'বিস্তারিত দেখুন'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {c.status !== 'running' && (
                            <button
                              onClick={() => handleDeleteCampaign(c.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors border border-surface-hover"
                              title={language === 'en' ? 'Delete' : 'মুছে ফেলুন'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>
    </div>
  );
}
