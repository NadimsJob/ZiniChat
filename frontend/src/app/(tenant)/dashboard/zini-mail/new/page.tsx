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
  ArrowLeft,
  ArrowRight,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Settings,
  HelpCircle,
  Eye,
  Layers,
  Globe,
  Share2,
  Lock,
  Flame,
  Zap,
  Info,
  Smartphone,
  ExternalLink,
  Coins,
  Server,
  ShieldCheck,
  RefreshCw,
  UploadCloud,
  HardDrive,
  ImageIcon,
  Trash2
} from 'lucide-react';
import SmtpSetupGuide, { SmtpGuideTab } from '@/components/outreach/SmtpSetupGuideModal';
import { COUNTRIES } from '@/lib/countryData';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function NewCampaignWizardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { enabled: isFeatureEnabled, loading: isFeatureLoading } = useRolloutFlag('ai_email_outreach');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzingBanner, setAnalyzingBanner] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // SMTP accounts & quota telemetry
  const [smtpSetting, setSmtpSetting] = useState<any>(null);
  const [availableAiCredits, setAvailableAiCredits] = useState<number>(0);
  const [isByok, setIsByok] = useState(false);
  const [quotaDetails, setQuotaDetails] = useState<{ total: number; used: number } | null>(null);
  const [showSmtpGuide, setShowSmtpGuide] = useState(false);
  const [smtpGuideTab, setSmtpGuideTab] = useState<SmtpGuideTab>('gmail');

  // Subscription Plan Synchronization
  const [quotaData, setQuotaData] = useState<{
    isSubscriptionActive?: boolean;
    aiQuota?: number;
    aiUsed?: number;
    allowByok?: boolean;
  } | null>(null);

  const isPlanActive = quotaData ? quotaData.isSubscriptionActive !== false : true;

  // Banner Upload State
  const [bannerMode, setBannerMode] = useState<'upload' | 'url'>('upload');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Basics
    name: '',
    targetCountry: 'Bangladesh',
    targetCity: 'Dhaka',
    keywords: ['handicraft', 'boutique', 'fashion'],
    keywordInput: '',
    channels: ['facebook', 'instagram'],
    phoneHarvestEnabled: true,

    // Step 2: Banner & Offer
    bannerImageUrl: '',
    bannerClickUrl: '',
    bannerSizeBytes: 180000,
    language: 'bn', // 'bn' | 'en' | 'banglish'
    tone: 'consultative', // 'consultative' | 'friendly' | 'urgent' | 'pas'

    // Step 3: AI Vision & Sample Draft
    bannerSummary: null as any,
    sampleDraft: null as any,

    // Step 4: Quota & Delivery
    totalLimit: 500,
    throttleIntervalSec: 60,
  });

  // Fetch tenant SMTP and AI Quota on mount
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const token = Cookies.get('access_token');
        const headers = { Authorization: `Bearer ${token}` };

        const [smtpRes, overviewRes, quotasRes] = await Promise.all([
          fetch(`${API}/tenant/smtp`, { headers }),
          fetch(`${API}/tenant/outreach/overview`, { headers }),
          fetch(`${API}/billing/quotas`, { headers }),
        ]);

        if (smtpRes.ok) {
          const smtpData = await smtpRes.json();
          setSmtpSetting(smtpData);
        }

        let credits = 0;
        let byokActive = false;

        if (overviewRes.ok) {
          const ovData = await overviewRes.json();
          if (ovData.isByok) byokActive = true;
          if (typeof ovData.availableAiCredits === 'number') {
            credits = Math.max(credits, ovData.availableAiCredits);
          }
        }

        if (quotasRes.ok) {
          const qData = await quotasRes.json();
          setQuotaData({
            isSubscriptionActive: qData.isSubscriptionActive,
            aiQuota: qData.aiQuota,
            aiUsed: qData.aiUsed,
            allowByok: qData.allowByok,
          });
          if (qData.allowByok) byokActive = true;

          const totalQuota = Number(qData.aiQuota || 0);
          const usedQuota = Number(qData.aiUsed || 0);
          setQuotaDetails({ total: totalQuota, used: usedQuota });

          const remaining = totalQuota === -1 ? -1 : Math.max(0, totalQuota - usedQuota);
          credits = remaining;
        }

        if (byokActive) {
          setIsByok(true);
        }

        setAvailableAiCredits(credits);
      } catch (err) {
        console.error('Failed to load outreach prerequisites', err);
      }
    };

    fetchPrerequisites();
  }, []);

  // Keyword tags handling
  const handleAddKeyword = () => {
    if (!form.keywordInput.trim()) return;
    const clean = form.keywordInput.trim().toLowerCase();
    if (!form.keywords.includes(clean)) {
      setForm({
        ...form,
        keywords: [...form.keywords, clean],
        keywordInput: '',
      });
    } else {
      setForm({ ...form, keywordInput: '' });
    }
  };

  const handleRemoveKeyword = (tag: string) => {
    setForm({
      ...form,
      keywords: form.keywords.filter((k) => k !== tag),
    });
  };

  const toggleChannel = (ch: string) => {
    if (form.channels.includes(ch)) {
      if (form.channels.length > 1) {
        setForm({ ...form, channels: form.channels.filter((c) => c !== ch) });
      }
    } else {
      setForm({ ...form, channels: [...form.channels, ch] });
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'en' ? 'Image exceeds 5MB limit' : 'ছবির সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে');
      return;
    }

    setUploadingBanner(true);
    const toastId = toast.loading(
      language === 'en' ? 'Uploading banner to your tenant storage...' : 'ব্যানার ছবি আপনার টেন্যান্ট স্টোরেজে আপলোড হচ্ছে...'
    );

    try {
      const token = Cookies.get('access_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API}/tenant/outreach/campaigns/upload-banner`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || (language === 'en' ? 'Failed to upload image' : 'ছবি আপলোড করতে ব্যর্থ হয়েছে'));
      }

      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        bannerImageUrl: data.url,
        bannerSizeBytes: data.sizeBytes || file.size,
      }));

      toast.success(
        language === 'en'
          ? 'Banner uploaded & saved to your storage!'
          : 'ব্যানার সফলভাবে আপলোড হয়েছে ও আপনার স্টোরেজে যুক্ত হয়েছে!',
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: toastId });
    } finally {
      setUploadingBanner(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Step 3 AI Vision Banner Analysis
  const handleAnalyzeBanner = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to use Vision AI.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। এআই ভিশন ব্যবহার করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    if (!form.bannerImageUrl.trim()) {
      toast.error(language === 'en' ? 'Please enter a valid banner image URL' : 'ব্যানার ছবির লিংক দিন');
      return;
    }

    try {
      setAnalyzingBanner(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/ai/analyze-banner`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bannerImageUrl: form.bannerImageUrl,
          brandName: form.name || 'ZiniChat Merchant',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI banner analysis failed');

      setForm((prev) => ({
        ...prev,
        bannerSummary: data.summary,
      }));
      toast.success(
        language === 'en'
          ? 'Vision AI analyzed banner successfully!'
          : 'এআই ভিশন ব্যানার সফলভাবে বিশ্লেষণ করেছে!',
      );
    } catch (err: any) {
      toast.error(err.message || 'Vision analysis error');
    } finally {
      setAnalyzingBanner(false);
    }
  };

  // Step 3 Sample Draft Generator
  const handleGenerateSampleDraft = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to generate email drafts.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ইমেইল ড্রাফট তৈরি করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    try {
      setGeneratingDraft(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/ai/sample-draft`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: form.name || 'Fashion House',
          language: form.language,
          tone: form.tone,
          bannerClickUrl: form.bannerClickUrl || 'https://mybrand.com/offer',
          bannerSummary: form.bannerSummary || {
            productCategory: 'Exclusive Handicrafts & Dresses',
            keyOffers: '20% off on all festive items',
            pricingAndDiscounts: 'Starting from ৳1,250',
            targetAudiencePainPoint: 'Need reliable festive collections with fast delivery',
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate draft');

      setForm((prev) => ({
        ...prev,
        sampleDraft: data,
      }));
      toast.success(language === 'en' ? 'AI generated draft sample!' : 'এআই ড্রাফট প্রস্তুত হয়েছে!');
    } catch (err: any) {
      toast.error(err.message || 'Draft generation error');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Step 4 AI Credits Math
  const requiredVisionCredits = 5;
  const requiredEmailCredits = form.totalLimit;
  const totalRequiredCredits = requiredVisionCredits + requiredEmailCredits;
  const isBalanceSufficient = isByok || availableAiCredits === -1 || availableAiCredits >= totalRequiredCredits;
  const creditDeficit = (isByok || availableAiCredits === -1) ? 0 : Math.max(0, totalRequiredCredits - availableAiCredits);
  const maxAffordableEmails = (isByok || availableAiCredits === -1) ? 5000 : Math.max(0, availableAiCredits - requiredVisionCredits);

  // Auto-Adjust to Max Affordable
  const handleAutoAdjust = () => {
    setForm((prev) => ({
      ...prev,
      totalLimit: maxAffordableEmails,
    }));
    toast.success(
      language === 'en'
        ? `Target quantity adjusted to ${maxAffordableEmails} emails`
        : `ইমেইল সংখ্যা ${maxAffordableEmails}-এ সমন্বয় করা হয়েছে`,
    );
  };

  // Final Submit: Create Campaign
  const handleCreateCampaign = async () => {
    if (!isPlanActive) {
      toast.error(
        language === 'en'
          ? 'Subscription plan expired. Please renew your plan to create and launch campaigns.'
          : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ। ক্যাম্পেইন তৈরি ও পরিচালনা করতে প্ল্যান রিনিউ করুন।'
      );
      return;
    }

    if (!form.name.trim()) {
      toast.error(language === 'en' ? 'Campaign name is required' : 'ক্যাম্পেইনের নাম দিন');
      setCurrentStep(1);
      return;
    }
    if (!form.bannerImageUrl.trim() || !form.bannerClickUrl.trim()) {
      toast.error(language === 'en' ? 'Banner image and destination URL are required' : 'ব্যানার ইমেজ ও ল্যান্ডিং পেজ লিংক দিন');
      setCurrentStep(2);
      return;
    }

    if (!isBalanceSufficient) {
      toast.error(
        language === 'en'
          ? 'Insufficient AI credits. Please buy credits or adjust quantity.'
          : 'অপর্যাপ্ত এআই ক্রেডিট। ক্রেডিট কিনুন অথবা ইমেইল সংখ্যা কমান।',
      );
      return;
    }

    try {
      setLoading(true);
      const token = Cookies.get('access_token');
      const res = await fetch(`${API}/tenant/outreach/campaigns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          targetCountry: form.targetCountry,
          targetCity: form.targetCity,
          targetKeywords: form.keywords,
          channels: form.channels,
          bannerImageUrl: form.bannerImageUrl.trim(),
          bannerClickUrl: form.bannerClickUrl.trim(),
          bannerSizeBytes: form.bannerSizeBytes,
          language: form.language,
          tone: form.tone,
          totalLimit: form.totalLimit,
          phoneHarvestEnabled: form.phoneHarvestEnabled,
          throttleIntervalSec: form.throttleIntervalSec,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create campaign');

      toast.success(
        language === 'en'
          ? 'Campaign created successfully!'
          : 'ক্যাম্পেইন সফলভাবে তৈরি হয়েছে!',
      );

      router.push(`/dashboard/zini-mail/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  if (isFeatureLoading) {
    return (
      <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between animate-pulse">
          <div className="h-4 w-28 bg-surface-hover/80 rounded" />
          <div className="h-4 w-16 bg-surface-hover/80 rounded" />
        </div>
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-sm animate-pulse">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 bg-surface-hover/70 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-surface-hover/80 rounded-xl" />
          <div className="h-4 w-72 bg-surface-hover/60 rounded" />
          <div className="space-y-3 pt-4">
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
            <div className="h-10 bg-surface-hover/60 rounded-xl" />
            <div className="h-24 bg-surface-hover/60 rounded-xl" />
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

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/zini-mail"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'en' ? 'Back to Campaigns' : 'ক্যাম্পেইনে ফিরে যান'}
        </Link>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {language === 'en' ? 'Step' : 'ধাপ'} {currentStep} / 4
        </span>
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
                {language === 'en' ? '⚠️ Subscription Plan Expired — Campaign Creation Locked' : '⚠️ সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ — নতুন ক্যাম্পেইন তৈরি লকড'}
              </h3>
              <p className="text-xs text-rose-300/80 mt-1 max-w-2xl leading-relaxed">
                {language === 'en'
                  ? 'Your subscription plan has expired. Creating campaigns, analyzing banner vision, and auto-generating outreach drafts require an active plan. Please renew your subscription to proceed.'
                  : 'আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়ে গেছে। নতুন ক্যাম্পেইন তৈরি, এআই ভিশন বিশ্লেষণ ও আউটরিচ ড্রাফট তৈরির জন্য একটি সক্রিয় প্ল্যান প্রয়োজন। এগিয়ে যেতে প্ল্যান রিনিউ করুন।'}
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

      {/* Wizard Progress Bar */}
      <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-2.5 sm:p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px] font-bold">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 1
                ? 'bg-[#1F824A] text-white shadow-sm font-bold'
                : currentStep > 1
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-surface-hover font-medium'
            }`}
          >
            1. <span className="hidden sm:inline">{language === 'en' ? 'Audience & Sourcing' : 'টার্গেট অডিয়েন্স'}</span>
            <span className="sm:hidden">{language === 'en' ? 'Audience' : 'অডিয়েন্স'}</span>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 2
                ? 'bg-[#1F824A] text-white shadow-sm font-bold'
                : currentStep > 2
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-surface-hover font-medium'
            }`}
          >
            2. <span className="hidden sm:inline">{language === 'en' ? 'Banner & Offer' : 'ব্যানার ও অফার'}</span>
            <span className="sm:hidden">{language === 'en' ? 'Banner' : 'ব্যানার'}</span>
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 3
                ? 'bg-[#1F824A] text-white shadow-sm font-bold'
                : currentStep > 3
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-surface-hover font-medium'
            }`}
          >
            3. <span className="hidden sm:inline">{language === 'en' ? 'AI Vision & Preview' : 'এআই ভিশন ড্রাফট'}</span>
            <span className="sm:hidden">{language === 'en' ? 'Draft' : 'ড্রাফট'}</span>
          </button>

          <button
            onClick={() => setCurrentStep(4)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 4
                ? 'bg-[#1F824A] text-white shadow-sm font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-surface-hover font-medium'
            }`}
          >
            4. <span className="hidden sm:inline">{language === 'en' ? 'SMTP & Quota Launch' : 'কোটা ও লঞ্চ'}</span>
            <span className="sm:hidden">{language === 'en' ? 'Launch' : 'লঞ্চ'}</span>
          </button>
        </div>
      </div>

      {/* STEP 1: Audience & Sourcing */}
      {currentStep === 1 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? 'Campaign Details & Lead Discovery' : 'ক্যাম্পেইন বিবরণ ও লিড সোর্সিং'}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {language === 'en'
                ? 'Specify target audience keywords and social platforms to dork through Google SERP.'
                : 'টার্গেট ইন্ডাস্ট্রি ও কীওয়ার্ড নির্ধারণ করুন।'}
            </p>
          </div>

          <div className="space-y-4 text-[12px]">
            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {language === 'en' ? 'Campaign Name *' : 'ক্যাম্পেইনের নাম *'}
              </label>
              <input
                type="text"
                placeholder="e.g. Festive Handicraft B2B Outreach 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
              />
            </div>

            {/* Target Country & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center justify-between">
                  <span>{language === 'en' ? 'Target Country *' : 'টার্গেট দেশ *'}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {language === 'en' ? 'Select from list' : 'তালিকা থেকে সিলেক্ট করুন'}
                  </span>
                </label>
                <select
                  value={form.targetCountry}
                  onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A] cursor-pointer"
                >
                  <optgroup label={language === 'en' ? '★ Popular Targets' : '★ জনপ্রিয় দেশসমূহ'}>
                    {['Bangladesh', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Saudi Arabia', 'India', 'Singapore', 'Malaysia', 'Germany', 'France', 'Italy'].map((cName) => {
                      const c = COUNTRIES.find((x) => x.name === cName);
                      if (!c) return null;
                      return (
                        <option key={`pop-${c.code}`} value={c.name}>
                          {c.flag} {language === 'en' ? c.name : `${c.nameBn} (${c.name})`}
                        </option>
                      );
                    })}
                  </optgroup>

                  <optgroup label={language === 'en' ? 'All Countries (A-Z)' : 'সকল দেশ (A-Z)'}>
                    {COUNTRIES.map((c) => (
                      <option key={`all-${c.code}`} value={c.name}>
                        {c.flag} {language === 'en' ? c.name : `${c.nameBn} (${c.name})`}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {language === 'en' ? 'Target City / District (Optional)' : 'টার্গেট শহর / জেলা'}
                </label>
                <input
                  type="text"
                  placeholder={
                    form.targetCountry === 'Bangladesh'
                      ? 'e.g. Dhaka, Chittagong, Sylhet'
                      : form.targetCountry === 'United States'
                      ? 'e.g. New York, California, Texas'
                      : form.targetCountry === 'United Kingdom'
                      ? 'e.g. London, Manchester, Birmingham'
                      : 'e.g. Capital / Major Cities'
                  }
                  value={form.targetCity}
                  onChange={(e) => setForm({ ...form, targetCity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
                />
              </div>
            </div>

            {/* Keyword Chips */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>{language === 'en' ? 'Target Keywords / Niches' : 'টার্গেট কীওয়ার্ড ও নিস'}</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  {language === 'en' ? 'Press Enter to add tag' : 'কীওয়ার্ড লিখে এন্টার চাপুন'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. boutique, pottery, honey, organic"
                  value={form.keywordInput}
                  onChange={(e) => setForm({ ...form, keywordInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 text-foreground font-semibold"
                >
                  {language === 'en' ? 'Add' : 'যোগ করুন'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {form.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-medium text-foreground"
                  >
                    #{kw}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Discovery Channels */}
            <div className="space-y-2 pt-2">
              <label className="font-semibold text-foreground">
                {language === 'en' ? 'Discovery Channels' : 'সোর্সিং চ্যানেল'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'facebook', label: 'Facebook Pages', icon: Share2 },
                  { id: 'instagram', label: 'Instagram Bios', icon: Globe },
                  { id: 'linkedin', label: 'LinkedIn B2B', icon: Layers },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = form.channels.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChannel(item.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        active
                          ? 'border-[#1F824A] bg-[#1F824A]/15 text-zinc-900 dark:text-white font-bold shadow-xs'
                          : 'border-border bg-surface text-zinc-600 dark:text-zinc-400 hover:bg-surface-hover'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-[#1F824A] dark:text-emerald-400' : 'text-zinc-400'}`} />
                      <span className="font-semibold text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Harvester Toggle */}
            <div className="p-3.5 rounded-xl border border-border bg-surface flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    {language === 'en'
                      ? 'No-Email Phone Harvester'
                      : 'ফোন নাম্বার থাকলে সংগ্রহ করুন (No-Email)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={form.phoneHarvestEnabled}
                    onChange={(e) => setForm({ ...form, phoneHarvestEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#1F824A] cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'en'
                    ? 'Extracts valid WhatsApp/mobile numbers even if no public email exists. Automatically tags and prepares leads for 1-Click WhatsApp Broadcast.'
                    : 'পাবলিক ইমেইল না থাকলেও ফেসবুক/ইনস্টাগ্রাম পেজ থেকে হোয়াটসঅ্যাপ নাম্বার সংগ্রহ করবে এবং ব্রডকাস্টের জন্য প্রস্তুত রাখবে।'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => {
                if (!form.name.trim()) {
                  toast.error(language === 'en' ? 'Please enter a campaign name' : 'ক্যাম্পেইনের নাম দিন');
                  return;
                }
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F824A] text-white font-bold text-[12px] hover:bg-[#1F824A]/90 transition-all"
            >
              {language === 'en' ? 'Continue to Banner & Offer' : 'ব্যানার ও অফারে যান'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Banner & Offer */}
      {currentStep === 2 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? 'Promotional Hero Banner & Destination' : 'প্রমোশনাল হিরো ব্যানার ও ল্যান্ডিং পেজ'}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {language === 'en'
                ? 'Upload the promotional flyer or banner image that will be featured in cold emails.'
                : 'ইমেইলের প্রধান হিরো ব্যানার এবং কাস্টমার ক্লিক করলে কোন পেজে যাবে তা নির্ধারণ করুন।'}
            </p>
          </div>

          <div className="space-y-4 text-[12px]">
            {/* Banner Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#1F824A]" />
                  <span>{language === 'en' ? 'Hero Banner Image *' : 'হিরো ব্যানার ছবি *'}</span>
                </label>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-surface border border-border rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBannerMode('upload')}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      bannerMode === 'upload'
                        ? 'bg-[#1F824A] text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Upload Image' : 'স্টোরেজে আপলোড'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerMode('url')}
                    className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      bannerMode === 'url'
                        ? 'bg-[#1F824A] text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Image URL' : 'ইমেজ লিংক'}</span>
                  </button>
                </div>
              </div>

              {/* UPLOAD MODE */}
              {bannerMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={handleBannerFileUpload}
                    className="hidden"
                  />

                  {form.bannerImageUrl ? (
                    <div className="p-4 rounded-2xl border border-border bg-surface/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
                            <HardDrive className="w-3 h-3" />
                            {language === 'en' ? 'Saved to Tenant Storage' : 'আপনার টেন্যান্ট স্টোরেজে সংরক্ষিত'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {(form.bannerSizeBytes / 1024).toFixed(1)} KB
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingBanner}
                            className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-[#1F824A] text-foreground text-[11px] font-medium transition-colors"
                          >
                            {language === 'en' ? 'Change Image' : 'ছবি পরিবর্তন'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, bannerImageUrl: '', bannerSizeBytes: 0 }))}
                            className="p-1 rounded-lg border border-border hover:border-rose-500/40 text-rose-500 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="max-h-56 rounded-xl overflow-hidden border border-border flex items-center justify-center bg-black/30">
                        <img
                          src={
                            form.bannerImageUrl.startsWith('http') || form.bannerImageUrl.startsWith('data:') || form.bannerImageUrl.startsWith('blob:')
                              ? form.bannerImageUrl
                              : `${API}${form.bannerImageUrl}`
                          }
                          alt="Hero Banner"
                          className="max-h-56 w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploadingBanner && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group ${
                        uploadingBanner
                          ? 'border-emerald-500 bg-emerald-500/5 cursor-wait'
                          : 'border-border hover:border-[#1F824A] bg-surface/40 hover:bg-surface/80'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#1F824A]/10 text-[#1F824A] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                        {uploadingBanner ? (
                          <RefreshCw className="w-6 h-6 animate-spin" />
                        ) : (
                          <UploadCloud className="w-6 h-6" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-bold text-foreground text-xs">
                          {uploadingBanner
                            ? (language === 'en' ? 'Uploading & saving to your storage...' : 'ছবি প্রসেস ও স্টোরেজে সংরক্ষণ হচ্ছে...')
                            : (language === 'en' ? 'Click to browse or drag & drop banner flyer' : 'ব্যানার ছবি আপলোড করতে এখানে ক্লিক করুন')}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {language === 'en'
                            ? 'PNG, JPG or WebP (Max 5MB)'
                            : 'পিএনজি, জেপিজি বা ওয়েবপি (সর্বোচ্চ ৫ মেগাবাইট)'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* URL MODE */}
              {bannerMode === 'url' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="https://yourdomain.com/banners/summer_offer.jpg"
                    value={form.bannerImageUrl}
                    onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    {language === 'en'
                      ? 'Recommended dimensions: 1200x630 or 800x800 px (JPEG/PNG under 1MB).'
                      : 'সুপারিশকৃত সাইজ: ১২০০x৬৩০ বা ৮০০x৮০০ পিক্সেল (১ মেগাবাইটের নিচে)।'}
                  </span>

                  {form.bannerImageUrl && (
                    <div className="p-3 rounded-xl border border-border bg-surface/50 space-y-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {language === 'en' ? 'Banner Preview' : 'ব্যানার প্রিভিউ'}:
                      </span>
                      <div className="max-h-48 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-black/20">
                        <img
                          src={
                            form.bannerImageUrl.startsWith('http') || form.bannerImageUrl.startsWith('data:') || form.bannerImageUrl.startsWith('blob:')
                              ? form.bannerImageUrl
                              : `${API}${form.bannerImageUrl}`
                          }
                          alt="Hero Banner"
                          className="max-h-48 object-contain"
                          onError={() => toast.error('Failed to load banner image from provided URL')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Destination URL */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {language === 'en' ? 'Destination Click URL *' : 'ক্লিক ডেস্টিনেশন লিংক *'}
              </label>
              <input
                type="text"
                placeholder="https://mybrand.com/festive-offer"
                value={form.bannerClickUrl}
                onChange={(e) => setForm({ ...form, bannerClickUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
              />
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />
                {language === 'en'
                  ? 'Smart Redirect Active: Zini-Mail automatically sets 30-day tracking cookies, logs clicks in real-time, and attributes completed orders.'
                  : 'স্মার্ট ট্র্যাকিং সক্রিয়: ব্যানার ক্লিকে ৩০ দিনের অ্যাট্রিবিউশন কুকি সেট হবে এবং সেলস স্বয়ংক্রিয়ভাবে ট্র্যাক হবে।'}
              </div>
            </div>

            {/* Language & Tone Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {language === 'en' ? 'Copywriting Language' : 'ইমেইল লেখার ভাষা'}
                </label>
                <select
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
                >
                  <option value="bn">বাংলা (Formal Bengali with 'আপনি')</option>
                  <option value="en">English (Crisp Professional B2B)</option>
                  <option value="banglish">Banglish (Conversational Merchant)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {language === 'en' ? 'Copywriting Tone' : 'ইমেইলের টোন'}
                </label>
                <select
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-[#1F824A]"
                >
                  <option value="consultative">Consultative (সমস্যা সমাধান ও পার্টনারশিপ)</option>
                  <option value="friendly">Friendly & Warm (সহজ ও আন্তরিক)</option>
                  <option value="urgent">Urgent & FOMO (সীমিত সময়ের অফার)</option>
                  <option value="pas">PAS Framework (Problem-Agitate-Solve)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-[12px]"
            >
              {language === 'en' ? 'Back' : 'পূর্ববর্তী'}
            </button>

            <button
              onClick={() => {
                if (!form.bannerImageUrl.trim() || !form.bannerClickUrl.trim()) {
                  toast.error(
                    language === 'en'
                      ? 'Please provide both banner image and destination click URL'
                      : 'ব্যানার ছবি ও ল্যান্ডিং পেজ লিংক উভয়ই পূরণ করুন',
                  );
                  return;
                }
                setCurrentStep(3);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F824A] text-white font-bold text-[12px] hover:bg-[#1F824A]/90 transition-all"
            >
              {language === 'en' ? 'Continue to AI Vision Preview' : 'এআই ভিশন প্রিভিউতে যান'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AI Vision & Sample Draft */}
      {currentStep === 3 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                {language === 'en' ? 'Gemini AI Vision Analysis & Test Draft' : 'এআই ভিশন বিশ্লেষণ ও টেস্ট ড্রাফট'}
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {language === 'en'
                  ? 'Verify how Google Gemini extracts key offers from your banner and drafts personalized copy.'
                  : 'ব্যানার থেকে এআই কী কী তথ্য পেয়েছে তা যাচাই করুন এবং ড্রাফট প্রিভিউ দেখুন।'}
              </p>
            </div>

            <button
              onClick={handleAnalyzeBanner}
              disabled={analyzingBanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border border-purple-500/20 transition-all shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzingBanner ? 'animate-spin' : ''}`} />
              {language === 'en' ? 'Run AI Analysis' : 'এআই বিশ্লেষণ চালান'}
            </button>
          </div>

          <div className="space-y-4 text-[12px]">
            {/* Vision Summary Cards */}
            {form.bannerSummary ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Product Category' : 'পণ্যের ক্যাটাগরি'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.productCategory || 'General Merchandise'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Detected Offers' : 'চিহ্নিত অফার'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.keyOffers || 'Special Pricing Available'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Pricing & Discounts' : 'মূল্য ও ডিসকাউন্ট'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.pricingAndDiscounts || 'As advertised on banner'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Target Pain Point' : 'গ্রাহকের সমস্যা ও সমাধান'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.targetAudiencePainPoint || 'Quality assurance and fast fulfillment'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                <p className="text-muted-foreground text-[12px]">
                  {language === 'en'
                    ? 'Click "Run AI Analysis" to extract structured offers from your banner, or proceed directly to drafting.'
                    : 'ব্যানার থেকে অফার ও তথ্য স্বয়ংক্রিয়ভাবে পড়তে উপরের বাটনে ক্লিক করুন।'}
                </p>
              </div>
            )}

            {/* Test Sample Draft Generator */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {language === 'en' ? 'Live Email Preview' : 'ইমেইল প্রিভিউ'}
                </span>

                <button
                  onClick={handleGenerateSampleDraft}
                  disabled={generatingDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-surface border border-border hover:bg-surface-hover text-foreground transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  {generatingDraft
                    ? (language === 'en' ? 'Generating...' : 'ড্রাফট তৈরি হচ্ছে...')
                    : (language === 'en' ? 'Generate Sample Draft' : 'স্যাম্পল ড্রাফট দেখুন')}
                </button>
              </div>

              {form.sampleDraft ? (
                <div className="p-4 rounded-xl border border-border bg-surface/80 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {language === 'en' ? 'Subject Line' : 'ইমেইল সাবজেক্ট'}:
                    </span>
                    <div className="font-bold text-foreground text-[13px]">
                      {form.sampleDraft.subject}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <div
                      className="prose prose-invert max-w-none text-[12px] bg-background/50 p-4 rounded-xl border border-border"
                      dangerouslySetInnerHTML={{ __html: form.sampleDraft.bodyHtml }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface/40 border border-border text-center text-muted-foreground text-[12px]">
                  {language === 'en'
                    ? 'Click "Generate Sample Draft" to preview how your personalized cold email will appear in recipients inboxes.'
                    : 'কাস্টমারদের ইনবক্সে ইমেইল কেমন দেখাবে তা দেখতে প্রিভিউ জেনারেট করুন।'}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-between items-center">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-[12px]"
            >
              {language === 'en' ? 'Back' : 'পূর্ববর্তী'}
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F824A] text-white font-bold text-[12px] hover:bg-[#1F824A]/90 transition-all"
            >
              {language === 'en' ? 'Continue to Quota & Launch' : 'কোটা ও লঞ্চে যান'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SMTP & Quota Safeguard */}
      {currentStep === 4 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? 'SMTP Verification & AI Credit Safeguard' : 'এসএমটিপি ও এআই ক্রেডিট যাচাই'}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              {language === 'en'
                ? 'Review your SMTP sending account and AI credit allocation before initiating the campaign.'
                : 'ক্যাম্পেইন চালুর পূর্বে আপনার আউটবাউন্ড এসএমটিপি এবং প্রয়োজনীয় এআই ব্যালেন্স নিশ্চিত করুন।'}
            </p>
          </div>

          <div className="space-y-5 text-[12px]">
            {/* SMTP Status Check */}
            <div className="p-4 rounded-xl border border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    smtpSetting?.isVerified
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-[13px] flex items-center gap-1.5">
                    {smtpSetting?.fromEmail || 'No SMTP Account Connected'}
                    {smtpSetting?.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {smtpSetting?.isVerified
                      ? `Verified Host: ${smtpSetting.host}:${smtpSetting.port}`
                      : 'You must configure and verify your custom SMTP before emails can be sent.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSmtpGuide(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-emerald-500/40 text-foreground font-semibold text-[11px] transition-colors shrink-0 shadow-sm"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {language === 'en' ? 'Credentials Guide (Gmail, cPanel, Outlook)' : 'পাসওয়ার্ড ও হোস্ট গাইড (জিমেইল, সিপ্যানেল, আউটলুক)'}
                </button>
                {!smtpSetting?.isVerified && (
                  <Link
                    href="/dashboard/zini-mail/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-bold text-[11px] hover:bg-rose-600 transition-colors shrink-0"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    {language === 'en' ? 'Setup SMTP' : 'এসএমটিপি সেটআপ করুন'}
                  </Link>
                )}
              </div>
            </div>

            {/* Assistance Banner when SMTP not connected */}
            {!smtpSetting?.isVerified && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      {language === 'en'
                        ? 'Action Required: Connect SMTP Before Dispatching'
                        : 'প্রয়োজনীয় পদক্ষেপ: ইমেইল পাঠানোর পূর্বে এসএমটিপি কানেক্ট করুন'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSmtpGuide(true)}
                    className="text-[11px] text-emerald-500 hover:text-emerald-400 font-bold underline flex items-center gap-1"
                  >
                    {language === 'en' ? 'Open Detailed Guide' : 'পূর্ণাঙ্গ গাইড দেখুন'}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {language === 'en'
                    ? 'You can connect Google Workspace/Gmail (with 16-char App Password), Microsoft 365 / Outlook (Port 587), or your Custom Hosting cPanel Webmail (mail.yourdomain.com, Port 465). Click the button above to view step-by-step instructions for each provider.'
                    : 'আপনি গুগল জিমেইল (১৬ অক্ষরের অ্যাপ পাসওয়ার্ড সহ), মাইক্রোসফট ৩৬৫ / আউটলুক (পোর্ট ৫৮৭), অথবা আপনার হোস্টিং সিপ্যানেল ওয়েবমেইল (mail.yourdomain.com, পোর্ট ৪৬৫) ব্যবহার করতে পারেন। প্রতিটি প্রোভাইডারের পাসওয়ার্ড ও হোস্ট কোথায় পাবেন তা জানতে নিচের বাটনে ক্লিক করুন।'}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setSmtpGuideTab('gmail'); setShowSmtpGuide(true); }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-red-500/40 text-[11px] font-medium text-foreground flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3 text-red-500" />
                    <span>Google / Gmail Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSmtpGuideTab('outlook'); setShowSmtpGuide(true); }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-blue-500/40 text-[11px] font-medium text-foreground flex items-center gap-1"
                  >
                    <Server className="w-3 h-3 text-blue-500" />
                    <span>Microsoft 365 Guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSmtpGuideTab('cpanel'); setShowSmtpGuide(true); }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-orange-500/40 text-[11px] font-medium text-foreground flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-orange-500" />
                    <span>cPanel Webmail Guide</span>
                  </button>
                  <Link
                    href="/dashboard/zini-mail/settings"
                    className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                    <span>{language === 'en' ? 'Go to SMTP Settings' : 'এসএমটিপি সেটিংস-এ যান'}</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Campaign Target Limit Slider & Visual Accuracy Engine */}
            <div className="space-y-3 p-4 rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span className="text-[13px]">{language === 'en' ? 'Target Email Quantity' : 'টার্গেট ইমেইল সংখ্যা'}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    ({language === 'en' ? 'Range: 50 – 5,000' : 'সীমা: ৫০ – ৫,০০০'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    step="50"
                    value={form.totalLimit}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) {
                        setForm({ ...form, totalLimit: Math.min(5000, Math.max(50, v)) });
                      }
                    }}
                    className="w-20 px-2 py-1 text-right font-black text-sm text-[#1F824A] bg-surface-hover/80 border border-border rounded-lg focus:outline-none focus:border-[#1F824A] transition-colors"
                  />
                  <span className="text-xs font-bold text-foreground">{language === 'en' ? 'Emails' : 'ইমেইল'}</span>
                </div>
              </div>

              {/* Progress Slider with mathematical fill */}
              {(() => {
                const sliderMin = 50;
                const sliderMax = 5000;
                const sliderPct = Math.min(100, Math.max(0, ((form.totalLimit - sliderMin) / (sliderMax - sliderMin)) * 100));
                return (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={sliderMin}
                      max={sliderMax}
                      step="50"
                      value={form.totalLimit}
                      onChange={(e) => setForm({ ...form, totalLimit: parseInt(e.target.value, 10) || 50 })}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#1F824A]"
                      style={{
                        background: `linear-gradient(to right, #1F824A 0%, #1F824A ${sliderPct}%, rgba(255, 255, 255, 0.12) ${sliderPct}%, rgba(255, 255, 255, 0.12) 100%)`
                      }}
                    />

                    {/* Mathematically Aligned Tick Marks (no fake justify-between spacing) */}
                    <div className="relative w-full h-4 text-[10px] text-muted-foreground select-none">
                      <span className="absolute left-0 top-0 cursor-pointer hover:text-foreground" onClick={() => setForm({ ...form, totalLimit: 50 })}>
                        50
                      </span>
                      <span
                        className="absolute top-0 -translate-x-1/2 cursor-pointer hover:text-foreground hover:underline"
                        style={{ left: `${((1000 - 50) / 4950) * 100}%` }}
                        onClick={() => setForm({ ...form, totalLimit: 1000 })}
                        title="1,000 Emails"
                      >
                        1,000
                      </span>
                      <span
                        className="absolute top-0 -translate-x-1/2 cursor-pointer hover:text-foreground hover:underline"
                        style={{ left: `${((2500 - 50) / 4950) * 100}%` }}
                        onClick={() => setForm({ ...form, totalLimit: 2500 })}
                        title="2,500 Emails"
                      >
                        2,500
                      </span>
                      <span
                        className="absolute top-0 -translate-x-1/2 cursor-pointer hover:text-foreground hover:underline"
                        style={{ left: `${((4000 - 50) / 4950) * 100}%` }}
                        onClick={() => setForm({ ...form, totalLimit: 4000 })}
                        title="4,000 Emails"
                      >
                        4,000
                      </span>
                      <span
                        className="absolute right-0 top-0 cursor-pointer hover:text-foreground"
                        onClick={() => setForm({ ...form, totalLimit: 5000 })}
                        title="5,000 Emails"
                      >
                        5,000
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Select Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground mr-1">{language === 'en' ? 'Quick Presets:' : 'দ্রুত নির্বাচন:'}</span>
                {[100, 500, 1000, 1650, 2500, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setForm({ ...form, totalLimit: preset })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      form.totalLimit === preset
                        ? 'bg-[#1F824A] text-white shadow-sm ring-1 ring-[#1F824A]'
                        : 'bg-surface-hover/70 hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Transparent Cost Breakdown Card */}
            <div className="p-4 rounded-xl border border-border bg-surface/50 space-y-3">
              <span className="font-bold text-foreground text-[13px] flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                {language === 'en' ? 'Transparent Cost Breakdown' : 'স্বচ্ছ খরচের হিসাব'}
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>{language === 'en' ? 'AI Banner Vision Extraction:' : 'ব্যানার এআই ভিশন বিশ্লেষণ:'}</span>
                  <span className="font-semibold text-foreground">5 AI Response Credits</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{language === 'en' ? 'Personalized Cold Email Drafting:' : 'পার্সোনালাইজড ইমেইল ড্রাফটিং:'}</span>
                  <span className="font-semibold text-foreground">{form.totalLimit} AI Response Credits (1/email)</span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground">
                  <span>{language === 'en' ? 'Total Required for Campaign:' : 'মোট প্রয়োজনীয় ক্রেডিট:'}</span>
                  <span className="text-[#1F824A] text-sm">{totalRequiredCredits} AI Credits</span>
                </div>
              </div>
            </div>

            {/* AI Credit Safeguard & Balance Matching Engine */}
            {!isPlanActive ? (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-[13px]">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  {language === 'en' ? 'Subscription Plan Expired!' : 'সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ!'}
                </div>
                <p className="text-[11px]">
                  {language === 'en'
                    ? 'Your subscription plan has expired. Campaign creation and email dispatch are locked until your plan is renewed.'
                    : 'আপনার সাবস্ক্রিপশন প্ল্যানের মেয়াদ শেষ হয়েছে। প্ল্যান রিনিউ না করা পর্যন্ত ক্যাম্পেইন তৈরি ও পাঠানো লক করা থাকবে।'}
                </p>
                <div className="pt-1">
                  <Link
                    href="/dashboard/settings/subscription"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] transition-all shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    {language === 'en' ? 'Renew Subscription Plan' : 'প্ল্যান রিনিউ করুন'}
                  </Link>
                </div>
              </div>
            ) : isBalanceSufficient ? (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{language === 'en' ? 'AI Balance Sufficient!' : 'আপনার এআই ক্রেডিট ব্যালেন্স পর্যাপ্ত রয়েছে!'}</span>
                  </div>
                  {isByok && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      BYOK Active
                    </span>
                  )}
                </div>
                <p className="text-[11px]">
                  {isByok
                    ? (language === 'en'
                        ? `BYOK / Enterprise AI is active (Unlimited AI responses). Campaign requires ${totalRequiredCredits} credits.`
                        : `নিজস্ব এপিআই / এন্টারপ্রাইজ এআই সক্রিয় আছে (আনলিমিটেড এআই রেসপন্স)। ক্যাম্পেইনের জন্য প্রয়োজন ${totalRequiredCredits} ক্রেডিট।`)
                    : (language === 'en'
                        ? `Available: ${availableAiCredits.toLocaleString()} Credits | Required: ${totalRequiredCredits.toLocaleString()} Credits. Launching will safely queue the emails.`
                        : `ব্যালেন্স আছে: ${availableAiCredits.toLocaleString()} ক্রেডিট | প্রয়োজন: ${totalRequiredCredits.toLocaleString()} ক্রেডিট। ক্যাম্পেইন নিরাপদে চালু করার জন্য প্রস্তুত।`)}
                </p>
                {quotaDetails && !isByok && (
                  <p className="text-[10px] text-muted-foreground pt-0.5">
                    {language === 'en'
                      ? `Monthly Plan Quota: ${quotaDetails.total.toLocaleString()} | Used this period: ${quotaDetails.used.toLocaleString()}`
                      : `মাসিক প্ল্যান কোটা: ${quotaDetails.total.toLocaleString()} | এই মেয়াদে ব্যবহৃত: ${quotaDetails.used.toLocaleString()}`}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-[13px]">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  {language === 'en' ? 'Insufficient AI Response Credits!' : 'অপর্যাপ্ত এআই ক্রেডিট ব্যালেন্স!'}
                </div>
                <p className="text-[11px]">
                  {language === 'en'
                    ? `You have ${availableAiCredits.toLocaleString()} credits, but this campaign requires ${totalRequiredCredits.toLocaleString()} credits (Shortage: ${creditDeficit.toLocaleString()} credits).`
                    : `আপনার ব্যালেন্সে ${availableAiCredits.toLocaleString()} ক্রেডিট আছে, কিন্তু প্রয়োজন ${totalRequiredCredits.toLocaleString()} ক্রেডিট (ঘাটতি: ${creditDeficit.toLocaleString()} ক্রেডিট)।`}
                </p>
                {quotaDetails && (
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'en'
                      ? `Plan Quota: ${quotaDetails.total.toLocaleString()} | Used this period: ${quotaDetails.used.toLocaleString()}`
                      : `প্ল্যান কোটা: ${quotaDetails.total.toLocaleString()} | এই মেয়াদে ব্যবহৃত: ${quotaDetails.used.toLocaleString()}`}
                  </p>
                )}

                {/* Instant Resolution Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {maxAffordableEmails > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoAdjust}
                      className="px-3 py-1.5 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover font-bold text-[11px] transition-all"
                    >
                      ⚡ {language === 'en' ? `Auto-Adjust to Max Affordable: ${maxAffordableEmails.toLocaleString()} Emails` : `অটো-অ্যাডজাস্ট করুন (${maxAffordableEmails.toLocaleString()} ইমেইল)`}
                    </button>
                  )}

                  <Link
                    href="/dashboard/settings/subscription"
                    className="px-3 py-1.5 rounded-lg bg-[#1F824A] hover:bg-[#1F824A]/90 text-white font-bold text-[11px] transition-all"
                  >
                    + {language === 'en' ? 'Buy AI Credits' : 'এআই ক্রেডিট কিনুন'}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-between items-center border-t border-border">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl border border-border hover:bg-surface-hover text-foreground font-semibold text-[12px]"
            >
              {language === 'en' ? 'Back' : 'পূর্ববর্তী'}
            </button>

            <button
              onClick={handleCreateCampaign}
              disabled={loading || !isBalanceSufficient || !isPlanActive}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all shadow-md ${
                !isBalanceSufficient || !isPlanActive || loading
                  ? 'bg-zinc-600 opacity-50 cursor-not-allowed'
                  : 'bg-[#1F824A] hover:bg-[#1F824A]/90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {language === 'en' ? 'Creating Campaign...' : 'ক্যাম্পেইন তৈরি হচ্ছে...'}
                </>
              ) : !isPlanActive ? (
                <>
                  <Lock className="w-4 h-4 text-rose-300" />
                  {language === 'en' ? 'Plan Expired (Locked)' : 'প্ল্যানের মেয়াদ শেষ (লক)'}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {language === 'en' ? 'Launch Campaign' : 'ক্যাম্পেইন চালু করুন'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Reusable Tabbed SMTP Credentials Guide Modal */}
      <SmtpSetupGuide
        mode="modal"
        isOpen={showSmtpGuide}
        onClose={() => setShowSmtpGuide(false)}
        activeTab={smtpGuideTab}
        onTabChange={setSmtpGuideTab}
      />
    </div>
  );
}
