'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { ShieldCheck, CheckCircle2, Award, Sparkles } from 'lucide-react';
import { WhatsAppBadgeIcon, MessengerBadgeIcon, InstagramBadgeIcon } from '@/components/BrandIcons';

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
        <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 shadow-sm backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-500 animate-pulse" />
            {language === 'en' ? 'Official Meta Tech Provider' : 'মেটা অফিশিয়াল টেক প্রোভাইডার'}
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl text-foreground">
            {language === 'en' ? (
              <>Official <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">Meta Tech Provider</span> & API Approval</>
            ) : (
              <>মেটা অফিশিয়াল <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 bg-clip-text text-transparent">টেক প্রোভাইডার</span> ও এপিআই এপ্রুভাল</>
            )}
          </h2>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl font-medium max-w-2xl mx-auto">
            {language === 'en'
              ? 'ZiniChat is officially verified by Meta as a Tech Provider. Automate WhatsApp, Facebook Messenger & Instagram DM with 100% official Meta infrastructure and zero ban risk.'
              : 'ZiniChat সরাসরি মেটা (Meta) কর্তৃক অনুমোদিত ও ভেরিফাইড টেক প্রোভাইডার (Meta Tech Provider)। কোনো ব্যান ঝুঁকি ছাড়া মেটার অফিশিয়াল ইনফ্রাস্ট্রাকচারে হোয়াটসঅ্যাপ, মেসেঞ্জার ও ইনস্টাগ্রাম এআই অটোমেশন চালান।'}
          </p>
        </div>

        {/* 🌟 HIGH-IMPACT PROMINENT META TECH PROVIDER LOGO SHOWCASE CARD 🌟 */}
        <div className="relative mx-auto max-w-4xl mb-12 sm:mb-16">
          <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 opacity-30 blur-xl transition-all duration-500 group-hover:opacity-60" />
          <div className="relative rounded-3xl border border-blue-500/30 bg-card/95 dark:bg-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
            
            {/* Logo Display Container */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-blue-200/80 flex items-center justify-center shrink-0 w-full md:w-auto">
              <img
                src="/meta-tech-provider.png"
                alt="Official Meta Tech Provider Logo"
                className="h-16 sm:h-20 lg:h-24 w-auto object-contain"
              />
            </div>

            {/* Verified Meta Status Details */}
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                {language === 'en' ? 'Meta Tech Provider Verified' : 'মেটা ভেরিফাইড টেক প্রোভাইডার'}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {language === 'en' ? 'Direct Meta Enterprise Partner Integration' : 'ডাইরেক্ট মেটা এন্টারপ্রাইজ পার্টনার ইন্টিগ্রেশন'}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
                {language === 'en'
                  ? 'ZiniChat holds direct Meta Tech Provider authorization, granting enterprise-grade Graph API access, high message volume throughput, and direct Meta technical support.'
                  : 'ZiniChat সরাসরি মেটা অফিশিয়াল টেক প্রোভাইডার একসেসপ্রাপ্ত। অফিশিয়াল মেটা গ্রাফ এপিআই (Graph API v21.0+), হাই-ভলিউম মেসেজিং স্পিড ও মেটার ডাইরেক্ট টেকনিক্যাল পার্টনার সাপোর্ট সুবিধা এতে অন্তর্ভুক্ত।'}
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> WhatsApp Business API
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Facebook Messenger DM
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Instagram Graph API
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* High-Impact Meta Trust Metrics Banner */}
        <div className="relative rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 via-surface/90 to-purple-950/40 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 items-center">
            
            <div className="flex items-center gap-4 md:col-span-1 border-b md:border-b-0 md:border-r border-border/60 pb-4 md:pb-0 md:pr-6">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-lg border border-blue-300">
                <img src="/meta-tech-provider.png" alt="Meta Tech Provider" className="h-full w-auto object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  {language === 'en' ? 'Official Meta Tech Provider' : 'মেটা অফিশিয়াল টেক প্রোভাইডার'}
                </h4>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  {language === 'en' ? 'Meta Tech Approved Partner' : 'মেটা অফিশিয়াল পার্টনারশিপ'}
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
                  {language === 'en' ? 'Uptime & Fast Throughput' : 'মেটা ক্লাউড আপটাইম guarantee'}
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}

