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
  ShieldCheck,
  RefreshCw,
  Coins
} from 'lucide-react';

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

        const [smtpRes, overviewRes] = await Promise.all([
          fetch(`${API}/tenant/smtp`, { headers }),
          fetch(`${API}/tenant/outreach/overview`, { headers }),
        ]);

        if (smtpRes.ok) {
          const smtpData = await smtpRes.json();
          setSmtpSetting(smtpData);
        }
        if (overviewRes.ok) {
          const ovData = await overviewRes.json();
          setAvailableAiCredits(ovData.availableAiCredits ?? 100);
        }
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

  // Step 3 AI Vision Banner Analysis
  const handleAnalyzeBanner = async () => {
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
  const creditDeficit = Math.max(0, totalRequiredCredits - availableAiCredits);
  const isBalanceSufficient = availableAiCredits >= totalRequiredCredits;
  const maxAffordableEmails = Math.max(0, availableAiCredits - requiredVisionCredits);

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
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading wizard...</div>;
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

      {/* Wizard Progress Bar */}
      <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 1
                ? 'bg-[#1F824A] text-white shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            1. {language === 'en' ? 'Audience & Sourcing' : 'টার্গেট অডিয়েন্স'}
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 2
                ? 'bg-[#1F824A] text-white shadow-sm'
                : currentStep > 2
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            2. {language === 'en' ? 'Banner & Offer' : 'ব্যানার ও অফার'}
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 3
                ? 'bg-[#1F824A] text-white shadow-sm'
                : currentStep > 3
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            3. {language === 'en' ? 'AI Vision & Preview' : 'এআই ভিশন ড্রাফট'}
          </button>

          <button
            onClick={() => setCurrentStep(4)}
            className={`py-2 px-1 rounded-xl transition-all ${
              currentStep === 4
                ? 'bg-[#1F824A] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-surface-hover'
            }`}
          >
            4. {language === 'en' ? 'SMTP & Quota Launch' : 'কোটা ও লঞ্চ'}
          </button>
        </div>
      </div>

      {/* STEP 1: Audience & Sourcing */}
      {currentStep === 1 && (
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-surface-hover pb-3">
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
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
              />
            </div>

            {/* Target Country & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {language === 'en' ? 'Target Country' : 'টার্গেট দেশ'}
                </label>
                <input
                  type="text"
                  value={form.targetCountry}
                  onChange={(e) => setForm({ ...form, targetCountry: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  {language === 'en' ? 'Target City / District (Optional)' : 'টার্গেট শহর / জেলা'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka, Chittagong, Sylhet"
                  value={form.targetCity}
                  onChange={(e) => setForm({ ...form, targetCity: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
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
                  className="flex-1 px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-surface-hover text-[11px] font-medium text-foreground"
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
                          ? 'border-[#1F824A] bg-[#1F824A]/10 text-foreground'
                          : 'border-surface-hover bg-surface text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-[#1F824A]' : 'text-muted-foreground'}`} />
                      <span className="font-semibold text-[11px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Harvester Toggle */}
            <div className="p-3.5 rounded-xl border border-surface-hover bg-surface flex items-start gap-3">
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-surface-hover pb-3">
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
            {/* Banner URL input */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                {language === 'en' ? 'Hero Banner Image URL *' : 'হিরো ব্যানার ছবির লিংক *'}
              </label>
              <input
                type="text"
                placeholder="https://yourdomain.com/banners/summer_offer.jpg"
                value={form.bannerImageUrl}
                onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
              />
              <span className="text-[10px] text-muted-foreground">
                {language === 'en'
                  ? 'Recommended dimensions: 1200x630 or 800x800 px (JPEG/PNG under 1MB).'
                  : 'সুপারিশকৃত সাইজ: ১২০০x৬৩০ বা ৮০০x৮০০ পিক্সেল (১ মেগাবাইটের নিচে)।'}
              </span>
            </div>

            {/* Banner Preview Card */}
            {form.bannerImageUrl && (
              <div className="p-3 rounded-xl border border-surface-hover bg-surface/50 space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {language === 'en' ? 'Banner Preview' : 'ব্যানার প্রিভিউ'}:
                </span>
                <div className="max-h-48 rounded-lg overflow-hidden border border-surface-hover flex items-center justify-center bg-black/20">
                  <img
                    src={form.bannerImageUrl}
                    alt="Hero Banner"
                    className="max-h-48 object-contain"
                    onError={() => toast.error('Failed to load banner image from provided URL')}
                  />
                </div>
              </div>
            )}

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
                className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
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
                  className="w-full px-3.5 py-2 rounded-xl bg-surface border border-surface-hover text-foreground focus:outline-none focus:border-[#1F824A]"
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
              className="px-4 py-2 rounded-xl border border-surface-hover hover:bg-surface-hover text-foreground font-semibold text-[12px]"
            >
              {language === 'en' ? 'Back' : 'পূর্ববর্তী'}
            </button>

            <button
              onClick={() => {
                if (!form.bannerImageUrl.trim() || !form.bannerClickUrl.trim()) {
                  toast.error(
                    language === 'en'
                      ? 'Please provide both banner image URL and destination click URL'
                      : 'ব্যানার ইমেজ ও ল্যান্ডিং পেজ লিংক দিন',
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-surface-hover pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                <div className="p-3 rounded-xl border border-surface-hover bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Product Category' : 'পণ্যের ক্যাটাগরি'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.productCategory || 'General Merchandise'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-surface-hover bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Detected Offers' : 'চিহ্নিত অফার'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.keyOffers || 'Special Pricing Available'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-surface-hover bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Pricing & Discounts' : 'মূল্য ও ডিসকাউন্ট'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.pricingAndDiscounts || 'As advertised on banner'}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-surface-hover bg-surface space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {language === 'en' ? 'Target Pain Point' : 'গ্রাহকের সমস্যা ও সমাধান'}
                  </span>
                  <div className="font-semibold text-foreground">
                    {form.bannerSummary.targetAudiencePainPoint || 'Quality assurance and fast fulfillment'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-surface-hover text-center space-y-2">
                <p className="text-muted-foreground text-[12px]">
                  {language === 'en'
                    ? 'Click "Run AI Analysis" to extract structured offers from your banner, or proceed directly to drafting.'
                    : 'ব্যানার থেকে অফার ও তথ্য স্বয়ংক্রিয়ভাবে পড়তে উপরের বাটনে ক্লিক করুন।'}
                </p>
              </div>
            )}

            {/* Test Sample Draft Generator */}
            <div className="pt-2 border-t border-surface-hover space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {language === 'en' ? 'Live Email Preview' : 'ইমেইল প্রিভিউ'}
                </span>

                <button
                  onClick={handleGenerateSampleDraft}
                  disabled={generatingDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-surface border border-surface-hover hover:bg-surface-hover text-foreground transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  {generatingDraft
                    ? (language === 'en' ? 'Generating...' : 'ড্রাফট তৈরি হচ্ছে...')
                    : (language === 'en' ? 'Generate Sample Draft' : 'স্যাম্পল ড্রাফট দেখুন')}
                </button>
              </div>

              {form.sampleDraft ? (
                <div className="p-4 rounded-xl border border-surface-hover bg-surface/80 space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {language === 'en' ? 'Subject Line' : 'ইমেইল সাবজেক্ট'}:
                    </span>
                    <div className="font-bold text-foreground text-[13px]">
                      {form.sampleDraft.subject}
                    </div>
                  </div>

                  <div className="border-t border-surface-hover pt-3">
                    <div
                      className="prose prose-invert max-w-none text-[12px] bg-background/50 p-4 rounded-xl border border-surface-hover"
                      dangerouslySetInnerHTML={{ __html: form.sampleDraft.bodyHtml }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-surface/40 border border-surface-hover text-center text-muted-foreground text-[12px]">
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
              className="px-4 py-2 rounded-xl border border-surface-hover hover:bg-surface-hover text-foreground font-semibold text-[12px]"
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
        <div className="bg-surface/70 backdrop-blur-xl border border-surface-hover rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="border-b border-surface-hover pb-3">
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
            <div className="p-4 rounded-xl border border-surface-hover bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

            {/* Campaign Target Limit Slider */}
            <div className="space-y-2 p-4 rounded-xl border border-surface-hover bg-surface">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>{language === 'en' ? 'Target Email Quantity' : 'টার্গেট ইমেইল সংখ্যা'}</span>
                <span className="text-[#1F824A] font-bold text-base">{form.totalLimit} Emails</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={form.totalLimit}
                onChange={(e) => setForm({ ...form, totalLimit: parseInt(e.target.value, 10) })}
                className="w-full accent-[#1F824A] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50</span>
                <span>1,000</span>
                <span>2,500</span>
                <span>5,000</span>
              </div>
            </div>

            {/* Transparent Cost Breakdown Card */}
            <div className="p-4 rounded-xl border border-surface-hover bg-surface/50 space-y-3">
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
                <div className="border-t border-surface-hover pt-1.5 flex justify-between font-bold text-foreground">
                  <span>{language === 'en' ? 'Total Required for Campaign:' : 'মোট প্রয়োজনীয় ক্রেডিট:'}</span>
                  <span className="text-[#1F824A] text-sm">{totalRequiredCredits} AI Credits</span>
                </div>
              </div>
            </div>

            {/* AI Credit Safeguard & Balance Matching Engine */}
            {isBalanceSufficient ? (
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[13px]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {language === 'en' ? 'AI Balance Sufficient!' : 'আপনার এআই ক্রেডিট ব্যালেন্স পর্যাপ্ত রয়েছে!'}
                </div>
                <p className="text-[11px]">
                  {language === 'en'
                    ? `Available: ${availableAiCredits} Credits | Required: ${totalRequiredCredits} Credits. Launching will safely queue the emails.`
                    : `ব্যালেন্স আছে: ${availableAiCredits} ক্রেডিট | প্রয়োজন: ${totalRequiredCredits} ক্রেডিট। ক্যাম্পেইন নিরাপদে চালু করার জন্য প্রস্তুত।`}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 space-y-3">
                <div className="font-bold flex items-center gap-1.5 text-[13px]">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  {language === 'en' ? 'Insufficient AI Response Credits!' : 'অপর্যাপ্ত এআই ক্রেডিট ব্যালেন্স!'}
                </div>
                <p className="text-[11px]">
                  {language === 'en'
                    ? `You have ${availableAiCredits} credits, but this campaign requires ${totalRequiredCredits} credits (Shortage: ${creditDeficit} credits).`
                    : `আপনার ব্যালেন্সে ${availableAiCredits} ক্রেডিট আছে, কিন্তু প্রয়োজন ${totalRequiredCredits} ক্রেডিট (ঘাটতি: ${creditDeficit} ক্রেডিট)।`}
                </p>

                {/* Instant Resolution Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {maxAffordableEmails > 0 && (
                    <button
                      type="button"
                      onClick={handleAutoAdjust}
                      className="px-3 py-1.5 rounded-lg bg-surface border border-surface-hover text-foreground hover:bg-surface-hover font-bold text-[11px] transition-all"
                    >
                      ⚡ {language === 'en' ? `Auto-Adjust to Max Affordable: ${maxAffordableEmails} Emails` : `অটো-অ্যাডজাস্ট করুন (${maxAffordableEmails} ইমেইল)`}
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

          <div className="pt-4 flex justify-between items-center border-t border-surface-hover">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl border border-surface-hover hover:bg-surface-hover text-foreground font-semibold text-[12px]"
            >
              {language === 'en' ? 'Back' : 'পূর্ববর্তী'}
            </button>

            <button
              onClick={handleCreateCampaign}
              disabled={loading || !isBalanceSufficient}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all shadow-md ${
                !isBalanceSufficient || loading
                  ? 'bg-zinc-600 opacity-50 cursor-not-allowed'
                  : 'bg-[#1F824A] hover:bg-[#1F824A]/90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {language === 'en' ? 'Creating Campaign...' : 'ক্যাম্পেইন তৈরি হচ্ছে...'}
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
    </div>
  );
}
