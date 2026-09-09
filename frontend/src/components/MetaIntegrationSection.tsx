'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { ShieldCheck, CheckCircle2, Zap, Lock, Sparkles, MessageSquare, Send, Globe, Award } from 'lucide-react';
import Link from 'next/link';

export function MetaIntegrationSection({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const { language } = useLanguage();

  return (
    <section className="relative w-full py-16 lg:py-24 overflow-hidden bg-background border-y border-border/40">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[35rem] h-[35rem] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 z-10">
        
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 shadow-sm backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-500 animate-pulse" />
            {language === 'en' ? 'Officially Meta Integrated Platform' : 'অফিশিয়ালি মেটা ইন্টিগ্রেটেড প্ল্যাটফর্ম'}
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            {language === 'en' ? (
              <>Official <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">Meta API Integration</span> & Approval</>
            ) : (
              <>মেটা অফিশিয়াল <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">এপিআই ইন্টিগ্রেশন</span> ও এপ্রুভাল</>
            )}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl font-medium max-w-2xl mx-auto">
            {language === 'en'
              ? 'ZiniChat is officially approved and integrated with Meta Cloud APIs. Power your business with 100% compliant, ban-free WhatsApp, Messenger & Instagram automation.'
              : 'ZiniChat সরাসরি মেটা ক্লাউড এপিআই অনুমোদিত ও ইন্টিগ্রেটেড। কোনো ব্যান ঝুঁকি ছাড়া ১০০% সেইফ হোয়াটসঅ্যাপ, ফেসবুক মেসেঞ্জার ও ইনস্টাগ্রাম এআই অটোমেশন চালান।'}
          </p>
        </div>

        {/* 3 Main Meta Platforms Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          
          {/* WhatsApp Cloud API */}
          <div className="group relative rounded-3xl border border-emerald-500/20 bg-card/80 dark:bg-surface/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-emerald-500/10" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center border border-[#25D366]/30 shadow-inner">
                  <MessageSquare className="w-7 h-7 fill-[#25D366]" />
                </div>
                <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Official API
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === 'en' ? 'WhatsApp Cloud API' : 'হোয়াটসঅ্যাপ ক্লাউড এপিআই'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {language === 'en'
                  ? 'Direct Meta server connection for bulk broadcast, verified templates & high-throughput AI auto-replies.'
                  : 'মেটা সার্ভার দিয়ে হাই-স্পিড বাল্ক মেসেজ ব্রডকাস্ট, ভেরিফাইড টেমপ্লেট ও এআই অটো-রেসপন্স।'}
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-foreground/90 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{language === 'en' ? '100% Account Safety (Zero Ban Risk)' : '১০০% একাউন্ট সেইফ (ব্যান ঝুঁকি মুক্ত)'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{language === 'en' ? 'Green Tick Badge Verification Ready' : 'অফিশিয়াল গ্রিন টিক ভেরিফিকেশন রেডি'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{language === 'en' ? 'Sub-second Webhook Latency' : 'সাব-সেকেন্ড সুপার-ফাস্ট রেসপন্স স্পিড'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Facebook Messenger API */}
          <div className="group relative rounded-3xl border border-blue-500/20 bg-card/80 dark:bg-surface/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-blue-500/10" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#0088CC]/10 text-[#0088CC] flex items-center justify-center border border-[#0088CC]/30 shadow-inner">
                  <Send className="w-7 h-7 fill-[#0088CC]" />
                </div>
                <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Meta Approved
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === 'en' ? 'Facebook Messenger API' : 'ফেসবুক মেসেঞ্জার এপিআই'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {language === 'en'
                  ? 'Official Meta Graph API connection for instant Page DM auto-replies, post comment management & live chat.'
                  : 'অফিশিয়াল মেটা গ্রাফ এপিআই দিয়ে পেজ ডিএম অটো-রিপ্লাই, পোস্ট কমেন্ট অটোমেশন ও লাইভ চ্যাট।'}
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-foreground/90 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{language === 'en' ? 'Automated Post Comment to DM' : 'অটোমেটিক পোস্ট কমেন্ট থেকে ডিএম সেন্ড'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{language === 'en' ? 'Direct Page Token Authentication' : 'মেটা অফিশিয়াল পেজ টোকেন সিকিউরিটি'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{language === 'en' ? 'Product Catalog & Order Capture' : 'মেসেঞ্জারে সরাসরি প্রোডাক্ট ক্যাটালগ ও অর্ডার'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Instagram DM API */}
          <div className="group relative rounded-3xl border border-pink-500/20 bg-card/80 dark:bg-surface/80 p-6 sm:p-8 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-pink-500/50 hover:shadow-2xl hover:shadow-pink-500/10 flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-bl-full pointer-events-none transition-all group-hover:bg-pink-500/10" />
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#E4405F]/10 text-[#E4405F] flex items-center justify-center border border-[#E4405F]/30 shadow-inner">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Meta Certified
                </span>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === 'en' ? 'Instagram DM API' : 'ইনস্টাগ্রাম ডিএম এপিআই'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {language === 'en'
                  ? 'Official Meta Instagram messaging integration. Auto-reply to DMs, story mentions, and post comments 24/7.'
                  : 'অফিশিয়াল মেটা ইনস্টাগ্রাম ইন্টিগ্রেশন। ডিএম, স্টোরি মেনশন ও পোস্ট কমেন্টে ২৪/৭ অটো-রিপ্লাই।'}
              </p>

              <ul className="space-y-2.5 text-xs sm:text-sm font-medium text-foreground/90 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                  <span>{language === 'en' ? 'Story Mention Instant Auto-Reply' : 'স্টোরি মেনশনে ইনস্ট্যান্ট অটো-রিপ্লাই'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                  <span>{language === 'en' ? 'Reels & Post Comment Automation' : 'রিলস ও পোস্ট কমেন্ট থেকে কাস্টমার লিড'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
                  <span>{language === 'en' ? 'Seamless Human Agent Handover' : 'প্রয়োজনে এআই থেকে লাইভ এজেন্টে হ্যান্ডওভার'}</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* High-Impact Meta Trust Metrics Banner */}
        <div className="relative rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-surface/90 to-purple-950/40 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 items-center">
            
            <div className="flex items-center gap-4 md:col-span-1 border-b md:border-b-0 md:border-r border-border/60 pb-4 md:pb-0 md:pr-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white font-black shrink-0 shadow-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  {language === 'en' ? 'Meta Tech Approved' : 'মেটা অনুমোদিত টেক প্ল্যাটফর্ম'}
                </h4>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {language === 'en' ? 'Official Graph API Partner' : 'অফিশিয়াল গ্রাফ এপিআই পার্টনারশিপ'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 md:col-span-3 gap-4 text-center">
              <div className="p-3 rounded-2xl bg-card/50 border border-border/40">
                <p className="text-xl sm:text-2xl font-black text-blue-500 font-mono">100%</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-1">
                  {language === 'en' ? 'Official Meta API Compliance' : 'মেটা অফিশিয়াল কমপ্লায়েন্স'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-card/50 border border-border/40">
                <p className="text-xl sm:text-2xl font-black text-emerald-500 font-mono">0 Risk</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-1">
                  {language === 'en' ? 'Account Ban / Lock Protection' : 'একাউন্ট ব্লক বা ব্যান সুরক্ষা'}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-card/50 border border-border/40">
                <p className="text-xl sm:text-2xl font-black text-purple-500 font-mono">99.9%</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-1">
                  {language === 'en' ? 'Uptime & Fast Throughput' : 'মেটা ক্লাউড আপটাইম garantee'}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
