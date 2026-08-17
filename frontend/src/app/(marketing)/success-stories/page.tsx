'use client';

import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';
import { ArrowRight, TrendingUp, Users, Zap, Clock } from 'lucide-react';
import ResultsSection from '@/components/ResultsSection';

export default function SuccessStoriesPage() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center w-full overflow-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative w-full bg-muted pb-16 pt-14 lg:pb-24 lg:pt-20 overflow-hidden">
        {/* glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/3 top-0 w-[40rem] h-[40rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-1/4 bottom-0 w-[30rem] h-[30rem] translate-y-1/2 rounded-full bg-secondary/10 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:text-sm mb-6">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="inline-flex w-2 h-2 rounded-full bg-primary" />
            </span>
            {language === 'en' ? 'Real Business Impact' : 'বাস্তব ব্যবসায়িক প্রভাব'}
          </div>

          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            {language === 'en' ? (
              <>What <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ZiniChat</span> does for businesses like yours</>
            ) : (
              <>আপনার মতো ব্যবসায় <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ZiniChat</span> যা করে</>
            )}
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {language === 'en'
              ? 'Industry-by-industry scenarios showing the measurable profit, time, and staff savings businesses gain when they replace manual messaging with ZiniChat.'
              : 'ইন্ডাস্ট্রি-ভিত্তিক সিনারিও যেখানে দেখা যায় ম্যানুয়াল মেসেজিং ZiniChat দিয়ে বদলালে ব্যবসায় কতটুকু আর্থিক লাভ, সময় ও কর্মী-সাশ্রয় হয়।'}
          </p>

          {/* 4-stat mini-bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: TrendingUp, value: { en: '+৳2.4L/yr', bn: '+৳২.৪ লাখ/বছর' }, label: { en: 'Avg. revenue gain', bn: 'গড় রেভিনিউ বৃদ্ধি' } },
              { icon: Users, value: { en: '3 → 1', bn: '৩ → ১' }, label: { en: 'Support FTE reduction', bn: 'সাপোর্ট কর্মী হ্রাস' } },
              { icon: Zap, value: { en: '1.2s', bn: '১.২ সে.' }, label: { en: 'AI response time', bn: 'AI রেসপন্স সময়' } },
              { icon: Clock, value: { en: '4h → 0', bn: '৪ ঘণ্টা → ০' }, label: { en: 'Daily admin hours saved', bn: 'দৈনিক অ্যাডমিন সময় সাশ্রয়' } },
            ].map((s, i) => (
              <div key={i} className="bg-card/70 backdrop-blur-sm border border-border/60 rounded-2xl p-4 text-center">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-xl font-black text-primary tracking-tight">
                  {language === 'en' ? s.value.en : s.value.bn}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-medium">
                  {language === 'en' ? s.label.en : s.label.bn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results Section (the main component) ──────────────────────── */}
      <ResultsSection />

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-primary py-20 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-primary-foreground">
            {language === 'en'
              ? 'Ready to see your numbers?'
              : 'আপনার ব্যবসার সংখ্যা দেখতে প্রস্তুত?'}
          </h2>
          <p className="text-base text-primary-foreground/80 mb-10 max-w-xl mx-auto sm:text-lg">
            {language === 'en'
              ? 'Start a free trial — no credit card required. Your first automation goes live in minutes.'
              : 'ফ্রি ট্রায়াল শুরু করুন — কোনো ক্রেডিট কার্ড দরকার নেই। প্রথম অটোমেশন মিনিটের মধ্যে চালু।'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-8 py-4 text-sm font-bold text-foreground transition-all hover:bg-surface-hover hover:scale-105 shadow-xl sm:text-base w-full sm:w-auto"
            >
              {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-8 py-4 text-sm font-bold text-primary-foreground backdrop-blur-sm transition-all hover:bg-primary-foreground/20 sm:text-base w-full sm:w-auto"
            >
              {language === 'en' ? 'See All Features' : 'সব ফিচার দেখুন'}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
