'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { useLanguage } from '@/components/LanguageProvider';
import { useRolloutFlag } from '@/hooks/useRolloutFlag';
import {
  Mail,
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Download,
  Share2,
  Flame,
  MousePointerClick,
  ShoppingBag,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  Send,
  Sparkles,
  Users,
  Layers,
  Globe,
  Clock,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CampaignDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.id as string;

  const { language } = useLanguage();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('ai_email_outreach');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [campaign, setCampaign] = useState<any>(null);

  // Leads and Filter State
  const initialFilter = searchParams.get('filter') || 'all';
  const [activeFilter, setActiveFilter] = useState<string>(initialFilter);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Email Preview Modal
  const [previewLead, setPreviewLead] = useState<any>(null);

  // Fetch campaign and leads
  const fetchCampaignData = async () => {
    try {
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API}/tenant/outreach/campaigns/${campaignId}`, { headers });
      if (!res.ok) throw new Error('Campaign not found');
      const data = await res.json();
      setCampaign(data);
    } catch (err: any) {
      console.error('Failed to load campaign', err);
      toast.error(language === 'en' ? 'Failed to load campaign' : 'ক্যাম্পেইন লোড করতে ব্যর্থ হয়েছে');
    }
  };

  const fetchLeads = async (page = 1, filter = activeFilter, search = searchTerm) => {
    try {
      setRefreshing(true);
      const token = Cookies.get('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      let url = `${API}/tenant/outreach/campaigns/${campaignId}/leads?page=${page}&limit=25&filter=${filter}`;
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to load leads');
      const data = await res.json();

      setLeads(data.leads || []);
      setLeadsTotal(data.total || 0);
      setLeadsPage(data.page || 1);
    } catch (err: any) {
      console.error('Failed to load leads', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
    fetchLeads(1, activeFilter, searchTerm);
  }, [campaignId, activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    fetchLeads(1, filter, searchTerm);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(1, activeFilter, searchTerm);
  };

  // Dispatch Controls
  const handleStartCampaign = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start campaign');

      toast.success(
        language === 'en'
          ? 'Campaign started! Sending queue is active.'
          : 'ক্যাম্পেইন চালু হয়েছে! কিউ সক্রিয় করা হয়েছে।',
      );
      fetchCampaignData();
    } catch (err: any) {
      toast.error(err.message || 'Error starting campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseCampaign = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to pause campaign');

      toast.success(language === 'en' ? 'Campaign paused.' : 'ক্যাম্পেইন সাময়িকভাবে স্থগিত করা হয়েছে।');
      fetchCampaignData();
    } catch (err: any) {
      toast.error(err.message || 'Error pausing campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeCampaign = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/dispatch/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resume campaign');

      toast.success(language === 'en' ? 'Campaign resumed!' : 'ক্যাম্পেইন পুনরায় চালু হয়েছে!');
      fetchCampaignData();
    } catch (err: any) {
      toast.error(err.message || 'Error resuming campaign');
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Harvest
  const handleTriggerHarvest = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/campaigns/${campaignId}/harvest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxHarvestLimit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Harvest failed');

      toast.success(
        language === 'en'
          ? `Discovered ${data.discoveredCount || 0} leads! Syncing to database.`
          : `${data.discoveredCount || 0} টি নতুন লিড সংগৃহীত হয়েছে!`,
      );
      fetchCampaignData();
      fetchLeads(1, activeFilter, searchTerm);
    } catch (err: any) {
      toast.error(err.message || 'Harvest error');
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Retarget "Clicked (No Order Yet)" Leads
  const handleRetargetHotLeads = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(
        `${API}/tenant/outreach/campaigns/${campaignId}/leads/retarget-broadcast`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to retarget leads');

      toast.success(
        language === 'en'
          ? `Marked ${data.retargetedCount} hot leads! Ready for WhatsApp Broadcast.`
          : `${data.retargetedCount} জন হট লিড ব্রডকাস্টের জন্য ট্যাগ করা হয়েছে!`,
      );
      fetchCampaignData();
      fetchLeads(1, activeFilter, searchTerm);
    } catch (err: any) {
      toast.error(err.message || 'Error retargeting leads');
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCsv = (filterType = activeFilter) => {
    const token = Cookies.get('access_token');
    window.open(
      `${API}/tenant/outreach/campaigns/${campaignId}/export-leads?filter=${filterType}&token=${token}`,
      '_blank',
    );
  };

  if (isFeatureLoading || loading) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-surface-hover/80 rounded" />
            <div className="h-7 w-64 bg-surface-hover/80 rounded-xl" />
            <div className="h-3 w-48 bg-surface-hover/60 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-surface-hover/80 rounded-xl" />
            <div className="h-9 w-32 bg-surface-hover/80 rounded-xl" />
          </div>
        </div>

        {/* Funnel Skeleton */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 w-40 bg-surface-hover/80 rounded" />
            <div className="h-4 w-24 bg-surface-hover/80 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-surface border border-surface-hover h-20 space-y-2">
                <div className="h-3 w-16 bg-surface-hover/60 rounded" />
                <div className="h-6 w-12 bg-surface-hover/80 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Filter Pills Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-surface/70 border border-surface-hover rounded-xl shrink-0" />
          ))}
        </div>

        {/* Table / Cards Skeleton */}
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 shadow-sm space-y-3 animate-pulse">
          <div className="h-9 w-full max-w-md bg-surface-hover/80 rounded-xl" />
          <div className="space-y-2 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-surface/50 border border-surface-hover rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isFeatureEnabled) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Feature under development.
      </div>
    );
  }

  const funnel = campaign?.funnelCounts || {};

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header Bar */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/dashboard/zini-mail"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'en' ? 'Back to Campaigns' : 'ক্যাম্পেইন তালিকায় ফিরে যান'}
            </Link>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {campaign?.name}
              </h1>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  campaign?.status === 'running'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 animate-pulse'
                    : campaign?.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : campaign?.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {campaign?.status?.toUpperCase()}
              </span>
            </div>

            <p className="text-[12px] text-muted-foreground">
              {language === 'en'
                ? `Created on ${new Date(campaign?.createdAt).toLocaleDateString()} • Destination: ${campaign?.bannerClickUrl}`
                : `তৈরি করা হয়েছে ${new Date(campaign?.createdAt).toLocaleDateString()} • ল্যান্ডিং পেজ: ${campaign?.bannerClickUrl}`}
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleTriggerHarvest}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-xl bg-surface border border-surface-hover hover:bg-surface-hover text-foreground transition-colors shadow-sm disabled:opacity-50"
            >
              <Search className={`w-3.5 h-3.5 text-blue-500 ${actionLoading ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Harvest Leads' : 'লিড হার্ভেস্ট করুন'}
            </button>

            {campaign?.status === 'running' ? (
              <button
                onClick={handlePauseCampaign}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                {language === 'en' ? 'Pause Sending' : 'স্থগিত করুন'}
              </button>
            ) : campaign?.status === 'paused' ? (
              <button
                onClick={handleResumeCampaign}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {language === 'en' ? 'Resume Queue' : 'চালু করুন'}
              </button>
            ) : (
              <button
                onClick={handleStartCampaign}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold rounded-xl bg-[#1F824A] text-white hover:bg-[#1F824A]/90 transition-all shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {language === 'en' ? 'Launch Campaign' : 'ক্যাম্পেইন চালু করুন'}
              </button>
            )}

            <button
              onClick={() => handleExportCsv(activeFilter)}
              className="p-2 rounded-xl bg-surface border border-surface-hover hover:bg-surface-hover text-foreground transition-colors"
              title={language === 'en' ? 'Export CSV' : 'সিএসভি ডাউনলোড করুন'}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5-Stage Visual Conversion Funnel Bar */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#1F824A]" />
            {language === 'en' ? 'Visual Marketing Funnel' : 'ভিজ্যুয়াল সেলস ফানেল'}
          </span>
          <span className="text-[#1F824A] font-bold">
            ৳{(campaign?.revenueGenerated || 0).toLocaleString()} {language === 'en' ? 'Revenue' : 'বিক্রয়'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {/* Stage 1: Discovered / Harvested */}
          <div className="p-3 rounded-xl bg-surface border border-surface-hover space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
              1. {language === 'en' ? 'Discovered' : 'সংগৃহীত'}
              <Users className="w-3.5 h-3.5 text-blue-500" />
            </span>
            <div className="text-lg font-bold text-foreground">
              {funnel.all ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {language === 'en' ? 'Limit:' : 'সীমা:'} {campaign?.totalLimit}
            </div>
          </div>

          {/* Stage 2: Sent */}
          <div className="p-3 rounded-xl bg-surface border border-surface-hover space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
              2. {language === 'en' ? 'Sent' : 'পাঠানো'}
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
            </span>
            <div className="text-lg font-bold text-foreground">
              {campaign?.sentCount ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {funnel.all > 0 ? ((campaign?.sentCount / funnel.all) * 100).toFixed(1) : 0}% delivery
            </div>
          </div>

          {/* Stage 3: Opened */}
          <div className="p-3 rounded-xl bg-surface border border-surface-hover space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
              3. {language === 'en' ? 'Opened' : 'ওপেন'}
              <Eye className="w-3.5 h-3.5 text-indigo-500" />
            </span>
            <div className="text-lg font-bold text-foreground">
              {campaign?.opensCount ?? 0}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold">
              {campaign?.sentCount > 0 ? ((campaign?.opensCount / campaign?.sentCount) * 100).toFixed(1) : 0}% open
            </div>
          </div>

          {/* Stage 4: Clicked */}
          <div className="p-3 rounded-xl bg-surface border border-surface-hover space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between">
              4. {language === 'en' ? 'Clicked' : 'ক্লিক'}
              <MousePointerClick className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <div className="text-lg font-bold text-foreground">
              {campaign?.clicksCount ?? 0}
            </div>
            <div className="text-[10px] text-amber-500 font-semibold">
              {campaign?.sentCount > 0 ? ((campaign?.clicksCount / campaign?.sentCount) * 100).toFixed(1) : 0}% CTR
            </div>
          </div>

          {/* Stage 5: Ordered */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-surface border border-[#1F824A]/30 bg-[#1F824A]/5 space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#1F824A] flex items-center justify-between">
              5. {language === 'en' ? 'Ordered' : 'অর্ডার'}
              <ShoppingBag className="w-3.5 h-3.5 text-[#1F824A]" />
            </span>
            <div className="text-lg font-bold text-[#1F824A]">
              {campaign?.ordersCount ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground">
              ৳{(campaign?.revenueGenerated || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs Navigation */}
      <div 
        className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x pb-1 text-[11px] font-bold"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => handleFilterChange('all')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'all'
              ? 'bg-foreground text-background border-foreground shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'All Leads' : 'সব লিড'} ({funnel.all ?? 0})
        </button>

        <button
          onClick={() => handleFilterChange('sent')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'sent'
              ? 'bg-foreground text-background border-foreground shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'Emails Sent' : 'মেইল পাঠানো'} ({funnel.sent ?? 0})
        </button>

        <button
          onClick={() => handleFilterChange('opened')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'opened'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'Opened' : 'ওপেন করেছে'} ({funnel.opened ?? 0})
        </button>

        <button
          onClick={() => handleFilterChange('clicked')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'clicked'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'Banner Clicked' : 'ক্লিক করেছে'} ({funnel.clicked ?? 0})
        </button>

        {/* 🔥 PRIMARY HIGHLIGHT PILL: Clicked (No Order Yet) */}
        <button
          onClick={() => handleFilterChange('clicked_no_order')}
          className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shrink-0 ${
            activeFilter === 'clicked_no_order'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-current animate-pulse" />
          <span>
            {language === 'en' ? '🔥 Clicked (No Order Yet)' : '🔥 ক্লিক করেছে, অর্ডার করেনি'} [{funnel.clickedNoOrder ?? 0}]
          </span>
        </button>

        <button
          onClick={() => handleFilterChange('ordered')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'ordered'
              ? 'bg-[#1F824A] text-white border-[#1F824A] shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'Ordered' : 'অর্ডার করেছে'} ({funnel.ordered ?? 0})
        </button>

        <button
          onClick={() => handleFilterChange('phone_only')}
          className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
            activeFilter === 'phone_only'
              ? 'bg-foreground text-background border-foreground shadow-sm'
              : 'bg-surface border-surface-hover text-muted-foreground hover:bg-surface-hover'
          }`}
        >
          {language === 'en' ? 'Phone Harvested' : 'ফোন নম্বর পাওয়া গেছে'} ({funnel.phoneOnly ?? 0})
        </button>
      </div>

      {/* DEDICATED ACTION BAR FOR "CLICKED (NO ORDER YET)" FILTER */}
      {activeFilter === 'clicked_no_order' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-amber-500 flex items-center gap-1.5 text-[13px]">
                <Flame className="w-4 h-4 text-amber-500" />
                {language === 'en'
                  ? 'High-Intent Hot Audience Retargeting'
                  : 'উচ্চ আগ্রহসম্পন্ন কাস্টমারদের পুনরায় টার্গেট করুন'}
              </div>
              <p className="text-[11px] text-muted-foreground max-w-2xl">
                {language === 'en'
                  ? `These ${funnel.clickedNoOrder ?? 0} prospects clicked your offer banner, demonstrating high buying intent without placing an order. Reach them on WhatsApp or export their contacts before interest cools down.`
                  : `এই ${funnel.clickedNoOrder ?? 0} জন গ্রাহক আপনার ব্যানার অফারে ক্লিক করেছেন কিন্তু অর্ডার সম্পূর্ণ করেননি। এখনই এদেরকে হোয়াটসঅ্যাপ ব্রডকাস্টের মাধ্যমে বিশেষ অফার দিন।`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Link
                href={`/dashboard/broadcasts?outreachCampaignId=${campaignId}&retarget=true`}
                onClick={handleRetargetHotLeads}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {language === 'en'
                  ? `Send WhatsApp Broadcast [${funnel.clickedNoOrder ?? 0}]`
                  : `হোয়াটসঅ্যাপ ব্রডকাস্ট পাঠান [${funnel.clickedNoOrder ?? 0}]`}
              </Link>

              <button
                onClick={() => handleExportCsv('clicked_no_order')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold rounded-xl bg-surface border border-surface-hover hover:bg-surface-hover text-foreground transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-amber-500" />
                {language === 'en' ? 'Export Hot Leads CSV' : 'হট লিড সিএসভি ডাউনলোড'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leads Table Section */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl shadow-sm overflow-hidden">
        {/* Search bar inside table */}
        <div className="p-4 border-b border-surface-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={
                  language === 'en'
                    ? 'Search leads by business name, email, or phone...'
                    : 'ব্যবসার নাম, ইমেইল বা ফোন নম্বর দিয়ে খুঁজুন...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-[12px] rounded-xl bg-surface border border-surface-hover text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#1F824A]"
              />
            </div>
          </form>

          <div className="text-[11px] font-semibold text-muted-foreground">
            {language === 'en' ? 'Showing' : 'দেখাচ্ছে'} {leads.length} of {leadsTotal} {language === 'en' ? 'prospects' : 'জন'}
          </div>
        </div>

        {/* Table / Card Rows */}
        {refreshing ? (
          <div className="p-8 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#1F824A] mx-auto" />
            <p className="text-xs text-muted-foreground">
              {language === 'en' ? 'Updating leads list...' : 'লিড তালিকা আপডেট হচ্ছে...'}
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2 text-[12px]">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <p>
              {language === 'en'
                ? 'No leads matching the current filter.'
                : 'এই ফিল্টারে কোনো লিড পাওয়া যায়নি।'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile-First Card View (Visible on < md) */}
            <div className="md:hidden divide-y divide-surface-hover/60">
              {leads.map((l) => (
                <div key={l.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-sm truncate">
                        {l.businessName}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {l.email ? l.email : (
                          <span className="text-amber-500 font-medium">#No-Email (Phone Only)</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        l.orderedAt
                          ? 'bg-[#1F824A]/10 text-[#1F824A] border-[#1F824A]/20'
                          : l.clickedAt
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : l.openedAt
                          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                          : l.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {l.orderedAt
                        ? 'ORDERED'
                        : l.clickedAt
                        ? 'CLICKED'
                        : l.openedAt
                        ? 'OPENED'
                        : l.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-surface-hover border border-surface-hover">
                      {l.sourceChannel}
                    </span>

                    {l.phone ? (
                      <a
                        href={`tel:${l.phone}`}
                        className="font-mono text-emerald-500 hover:underline flex items-center gap-1"
                      >
                        <Smartphone className="w-3 h-3" />
                        {l.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}

                    {l.personalizedSubject ? (
                      <button
                        onClick={() => setPreviewLead(l)}
                        className="inline-flex items-center gap-1 text-[11px] text-[#1F824A] font-semibold hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Preview' : 'প্রিভিউ'}
                      </button>
                    ) : null}
                  </div>

                  {(l.clickedAt || l.openedAt || l.sentAt) && (
                    <div className="text-[10px] text-muted-foreground pt-0.5">
                      {l.clickedAt ? (
                        <span className="text-amber-500 font-medium">
                          Clicked: {new Date(l.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : l.openedAt ? (
                        <span>
                          Opened: {new Date(l.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span>
                          Sent: {new Date(l.sentAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (Visible on >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-surface/50 border-b border-surface-hover text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">{language === 'en' ? 'Business / Contact' : 'ব্যবসা / কন্টাক্ট'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Channel' : 'চ্যানেল'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Phone' : 'ফোন'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Status' : 'অবস্থা'}</th>
                    <th className="py-3 px-3">{language === 'en' ? 'Activity Timeline' : 'অ্যাক্টিভিটি টাইমলাইন'}</th>
                    <th className="py-3 px-4 text-right">{language === 'en' ? 'Preview' : 'প্রিভিউ'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-hover/60">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-hover/30 transition-colors">
                      {/* Business Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">
                          {l.businessName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {l.email ? l.email : (
                            <span className="text-amber-500 font-medium">#No-Email (Phone Only)</span>
                          )}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-hover text-muted-foreground border border-surface-hover">
                          {l.sourceChannel}
                        </span>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                        {l.phone || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            l.orderedAt
                              ? 'bg-[#1F824A]/10 text-[#1F824A] border-[#1F824A]/20'
                              : l.clickedAt
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : l.openedAt
                              ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                              : l.status === 'sent'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {l.orderedAt
                            ? 'ORDERED'
                            : l.clickedAt
                            ? 'CLICKED'
                            : l.openedAt
                            ? 'OPENED'
                            : l.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Timestamps */}
                      <td className="py-3 px-3 text-[11px] text-muted-foreground space-y-0.5">
                        {l.clickedAt && (
                          <div className="text-amber-500 font-medium">
                            Clicked: {new Date(l.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {l.openedAt && !l.clickedAt && (
                          <div>
                            Opened: {new Date(l.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {l.sentAt && !l.openedAt && (
                          <div>
                            Sent: {new Date(l.sentAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Action: Preview */}
                      <td className="py-3 px-4 text-right">
                        {l.personalizedSubject ? (
                          <button
                            onClick={() => setPreviewLead(l)}
                            className="p-1.5 rounded-lg border border-surface-hover hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                            title="View Personalized Email"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Email Preview Modal */}
      {previewLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-surface-hover rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-surface-hover pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">
                  Personalized Cold Email
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {previewLead.businessName} ({previewLead.email || 'No email'})
                </h3>
              </div>
              <button
                onClick={() => setPreviewLead(null)}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-[12px]">
              <div>
                <span className="font-bold text-muted-foreground">Subject: </span>
                <span className="font-semibold text-foreground">
                  {previewLead.personalizedSubject}
                </span>
              </div>

              <div className="border border-surface-hover rounded-xl p-4 bg-background/50">
                <div
                  className="prose prose-invert max-w-none text-[12px]"
                  dangerouslySetInnerHTML={{ __html: previewLead.personalizedBodyHtml || '' }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-hover">
              <button
                onClick={() => setPreviewLead(null)}
                className="px-4 py-2 rounded-xl bg-surface border border-surface-hover hover:bg-surface-hover text-foreground font-semibold text-[12px]"
              >
                {language === 'en' ? 'Close' : 'বন্ধ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
