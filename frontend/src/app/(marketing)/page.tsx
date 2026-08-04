'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import { useMetaPixel } from '@/context/MetaPixelContext';
import { useGoogleAnalytics } from '@/context/GoogleAnalyticsContext';
import Link from 'next/link';
import { Bot, ShieldCheck, ArrowRight, CheckCircle2, MessageSquare, Zap, Globe, Users, ShoppingCart, Star, Send, CheckCheck, PlayCircle, Timer, Sparkles } from 'lucide-react';
import { InteractiveFeatureTabs, processFeatures } from '@/components/InteractiveFeatureTabs';
import { PricingSection } from '@/components/PricingSection';
import SetupWidgetMockup from '@/components/SetupWidgetMockup';
import PwaInstallBanner from '@/components/PwaInstallBanner';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const DEFAULT_BRANDS = [
  { name: 'Star Tech Electronics' },
  { name: 'Evaly Express' },
  { name: 'StyleHub BD' },
  { name: 'Gadget Express' },
  { name: 'Urban Threads BD' },
  { name: 'FreshMart Online' },
];

function WhatsAppBotMockup({ language }: { language: string }) {
  return (
    <div className="w-full max-w-sm animate-fade-in-up overflow-hidden rounded-[2rem] border-[6px] border-black/5 dark:border-white/5 bg-[#efeae2] dark:bg-[#0b141a] shadow-2xl shadow-primary/20 relative">
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 bg-[#075E54] dark:bg-[#202c33] px-4 py-3 text-white shadow-sm relative z-10">
        <div className="flex w-9 h-9 items-center justify-center rounded-full bg-white/20">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-[15px] font-semibold leading-tight">ZiniChat AI</p>
          <p className="text-[11px] text-white/80">
            {language === 'en' ? 'online' : 'অনলাইন'}
          </p>
        </div>
      </div>
      
      {/* Chat Background Pattern */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")' }}></div>

      <div className="space-y-3 p-4 relative z-10">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="relative max-w-[85%] rounded-lg rounded-tr-sm bg-[#dcf8c6] dark:bg-[#005c4b] px-3 py-1.5 text-[14px] text-zinc-900 dark:text-zinc-100 shadow-sm">
            <span className="leading-snug">{language === 'en' ? 'Hello, I want to order the blue sneakers.' : 'হ্যালো, আমি নীল স্নিকার অর্ডার করতে চাই।'}</span>
            <div className="mt-0.5 flex justify-end items-center gap-1">
              <span className="text-[10px] text-black/45 dark:text-white/45">10:41 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>
        {/* Bot Message */}
        <div className="flex justify-start">
          <div className="relative max-w-[85%] rounded-lg rounded-tl-sm bg-white dark:bg-[#202c33] px-3 py-1.5 text-[14px] text-zinc-900 dark:text-zinc-100 shadow-sm">
            <span className="leading-snug">{language === 'en' ? 'Great choice! 🎉 The Blue Runner is in stock for $25. Shall I place the order?' : 'দারুণ পছন্দ! 🎉 Blue Runner স্টকে আছে। দাম ৳২,৪৫০। অর্ডার করে দেব?'}</span>
            <div className="mt-0.5 flex justify-end">
              <span className="text-[10px] text-black/45 dark:text-white/45">10:41 AM</span>
            </div>
          </div>
        </div>
        {/* User Message */}
        <div className="flex justify-end">
          <div className="relative max-w-[85%] rounded-lg rounded-tr-sm bg-[#dcf8c6] dark:bg-[#005c4b] px-3 py-1.5 text-[14px] text-zinc-900 dark:text-zinc-100 shadow-sm">
            <span className="leading-snug">{language === 'en' ? 'Yes, please! 🙌' : 'হ্যাঁ, দিন! 🙌'}</span>
            <div className="mt-0.5 flex justify-end items-center gap-1">
              <span className="text-[10px] text-black/45 dark:text-white/45">10:42 AM</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
            </div>
          </div>
        </div>
        {/* Bot Typing */}
        <div className="flex justify-start">
          <div className="relative flex items-center gap-1 rounded-lg rounded-tl-sm bg-white dark:bg-[#202c33] px-4 py-2.5 shadow-sm">
            <span className="inline-block w-1.5 h-1.5 animate-typing-dot rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ animationDelay: '0s' }}></span>
            <span className="inline-block w-1.5 h-1.5 animate-typing-dot rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ animationDelay: '0.2s' }}></span>
            <span className="inline-block w-1.5 h-1.5 animate-typing-dot rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ animationDelay: '0.4s' }}></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const { formatBDT } = useCurrency();
  const { trackEvent } = useMetaPixel();
  const { trackEvent: trackGaEvent } = useGoogleAnalytics();
  const [activeFeature, setActiveFeature] = useState(0);
  const [config, setConfig] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clientLogos, setClientLogos] = useState<any[]>([]);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'inbox'>('overview');

  useEffect(() => {
    trackEvent('PageView');
    trackGaEvent('page_view', {
      page_title: 'ZiniChat Landing',
      page_location: typeof window !== 'undefined' ? window.location.href : '',
    });

    fetch(`${API}/tenants/public/client-logos`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setClientLogos(data))
      .catch(() => {});
  }, [trackEvent]);

  const displayLogos = clientLogos.length > 0 ? clientLogos : DEFAULT_BRANDS;

  useEffect(() => {
    Promise.all([
      fetch(`${API}/landing-page/config`).then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      }),
      fetch(`${API}/packages/plans`).then(res => res.ok ? res.json() : [])
    ])
    .then(([configData, plansData]) => {
      setConfig(configData);
      setPlans((plansData || []).sort((a: any, b: any) => a.priceMonthlyBdt - b.priceMonthlyBdt));
      setLoading(false);
    })
    .catch(err => {
      console.warn("Could not fetch data from backend.", err.message);
      setError(true);
      setLoading(false);
    });
  }, []);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Backend Connection Failed</h2>
        <p className="text-zinc-500 max-w-md">
          The frontend could not connect to the backend server.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      
      {/* Hero Section - Alapai Style */}
      <section className="relative w-full overflow-hidden bg-muted pb-16 pt-8 lg:pb-24 lg:pt-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 top-20 w-[30rem] h-[30rem] rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute -left-40 bottom-0 w-[25rem] h-[25rem] rounded-full bg-secondary/10 blur-3xl"></div>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
          <div className="flex flex-col justify-center lg:col-span-6 z-10">
            <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary sm:text-sm">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="inline-flex w-2 h-2 rounded-full bg-primary"></span>
                </span>
                {language === 'en' ? 'AI Powered • 24/7 Active' : 'AI দিয়ে চালিত • ২৪/৭ চালু'}
              </div>
            </div>
            
            <h1 className="mb-4 text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-snug sm:leading-none break-words">
              {language === 'en' ? config.heroTitle : (config.heroTitleBn || config.heroTitle)}
            </h1>
            
            <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
              {language === 'en' ? config.heroSubtitle : (config.heroSubtitleBn || config.heroSubtitle)}
            </p>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 sm:text-base" href="/signup">
                <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                {language === 'en' ? 'Start for Free' : 'ফ্রিতে শুরু করুন'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary sm:text-base" href="/contact">
                {language === 'en' ? 'Contact Sales' : 'যোগাযোগ করুন'}
              </Link>
            </div>
            
            <div className="mt-10 flex items-center gap-6 border-t border-border pt-6 sm:gap-10">
              <div>
                <p className="text-2xl font-bold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Always Online' : 'সবসময় অনলাইন'}</p>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">5+</p>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Platforms' : 'প্ল্যাটফর্ম'}</p>
              </div>
              <div className="h-8 w-px bg-border"></div>
              <div>
                <p className="text-2xl font-bold text-foreground">10x</p>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Faster Replies' : 'দ্রুত জবাব'}</p>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:col-span-6 mt-10 lg:mt-0">
            {/* Floating Platform Icons */}
            <div className="absolute -left-2 top-8 sm:left-0 lg:-left-4 animate-float rounded-xl bg-card p-2.5 shadow-lg shadow-border/80 transition-transform sm:p-3" style={{ animationDelay: '0s' }}>
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-[#25D366] fill-[#25D366]" />
            </div>
            <div className="absolute -right-2 top-16 sm:right-0 lg:-right-4 animate-float rounded-xl bg-card p-2.5 shadow-lg shadow-border/80 transition-transform sm:p-3" style={{ animationDelay: '0.5s' }}>
              <Send className="w-6 h-6 sm:w-7 sm:h-7 text-[#0088CC] fill-[#0088CC]" />
            </div>
            <div className="absolute -left-2 bottom-20 sm:left-2 lg:-left-2 animate-float rounded-xl bg-card p-2.5 shadow-lg shadow-border/80 transition-transform sm:p-3" style={{ animationDelay: '1s' }}>
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-[#E4405F]" />
            </div>
            
            <WhatsAppBotMockup language={language} />
          </div>
        </div>

        {/* 2-Minute Setup Highlight */}
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4 sm:mt-12">
          <SetupWidgetMockup language={language} />
        </div>
      </section>

      {/* Trusted By - Dynamic Continuous Sliding Marquee */}
      <section className="relative overflow-hidden w-full bg-background py-14 lg:py-20 border-y border-border/40">
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground shadow-sm">
            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
            {language === 'en' ? 'Trusted by innovative businesses' : 'সারা বাংলাদেশে প্রগ্রেসিভ ব্র্যান্ডসমূহ'}
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {language === 'en' ? 'Growing businesses scaling with ' : 'আজই আপনার ব্যবসা অটোমেট করুন '}
            <span className="text-primary underline decoration-primary/30 underline-offset-4">{language === 'en' ? 'ZiniChat' : 'ZiniChat-এর সাথে'}</span>
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base font-medium">
            {language === 'en' ? 'From E-commerce to Services, top Bangladesh brands automate sales with us.' : 'ই-কমার্স, রিটেইল থেকে সার্ভিস — শীর্ষ ব্র্যান্ডগুলো তাদের সেলস ও কাস্টমার সাপোর্ট চালাচ্ছে ZiniChat-এ।'}
          </p>
        </div>

        {/* Continuous Sliding Marquee */}
        <div className="relative w-full overflow-hidden py-4 bg-surface/30 backdrop-blur-md">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
          
          <div className="flex w-[200%] animate-marquee hover:[animation-play-state:paused] items-center gap-6">
            {/* Repeat list twice for seamless infinite loop */}
            {[...displayLogos, ...displayLogos].map((client, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 shrink-0 rounded-2xl border border-border/80 bg-card px-5 py-3 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-default"
              >
                {client.logoUrl ? (
                  <img
                    src={client.logoUrl.startsWith('http') ? client.logoUrl : `${API}${client.logoUrl}`}
                    alt={client.name}
                    className="h-8 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {client.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-bold text-foreground/80 whitespace-nowrap">{client.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tenant Dashboard UI Snapshot Showcase */}
      <section className="relative w-full bg-muted/50 py-16 lg:py-24 border-b border-border/40 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {language === 'en' ? 'Live Tenant Dashboard Snapshot' : 'লাইভ ড্যাশবোর্ড ইন্টারফেস প্রিভিউ'}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
              {language === 'en' ? 'Powerful Executive Command Center' : 'এক নজরে আপনার ব্যবসার সম্পূর্ণ নিয়ন্ত্রণ'}
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {language === 'en' 
                ? 'Real-time KPIs, AI Daily Summaries, Omnichannel Live Inbox, and automated payment tracking in one sleek dashboard.' 
                : 'লাইভ কেপিআই, দৈনিক এআই সামারি, অমনিচ্যানেল ইনবক্স ও অটোমেটেড পেমেন্ট ট্র্যাকিং — সব একসাথে।'}
            </p>
          </div>

          {/* Interactive Mock Dashboard Frame */}
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-white via-slate-50/90 to-amber-500/5 backdrop-blur-2xl p-4 sm:p-6 shadow-2xl shadow-primary/10 max-w-6xl mx-auto space-y-6">
            
            {/* Dashboard Header Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-secondary to-amber-400 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                  Z
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                    StyleHub BD <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">Active Pro</span>
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {language === 'en' ? 'AI Sales Agent Online (24/7 Autopilot)' : 'এআই সেলস এজেন্ট অনলাইন (২৪/৭ চালু)'}
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border">
                <button
                  onClick={() => setDashboardTab('overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dashboardTab === 'overview' ? 'bg-gradient-to-r from-primary to-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {language === 'en' ? 'KPI Overview' : 'কেপিআই ড্যাশবোর্ড'}
                </button>
                <button
                  onClick={() => setDashboardTab('inbox')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dashboardTab === 'inbox' ? 'bg-gradient-to-r from-primary to-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {language === 'en' ? 'Live Inbox' : 'লাইভ ইনবক্স (3 Unread)'}
                </button>
              </div>
            </div>

            {/* Tab 1: Executive KPI Overview */}
            {dashboardTab === 'overview' && (
              <div className="space-y-6 animate-fade-in-up">
                
                {/* AI Daily Summary Alert Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-amber-500/10 to-secondary/15 border border-primary/25 shadow-sm flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-emerald-600 text-white flex items-center justify-center shrink-0 font-bold shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        {language === 'en' ? 'Today AI Summary' : 'আজকের এআই সামারি'}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">Updated 5m ago</span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-foreground/90 leading-relaxed">
                      {language === 'en' 
                        ? 'AI automatically handled 88% of messages today (+15% msg volume). Acquired 18 new leads, received 24 completed orders (Total ৳48,500), and sent 1 broadcast campaign.' 
                        : 'আজ এআই অটোমেশন ৮৮% মেসেজ হ্যান্ডেল করেছে। গতকালের তুলনায় মেসেজ ভলিউম ১৫% বেড়েছে। ১৮টি নতুন লিড, ২৪টি ডেলিভার্ড অর্ডার (মোট ৳৪৮,৫০০) অর্জিত হয়েছে।'}
                    </p>
                  </div>
                </div>

                {/* 4 Key Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>{language === 'en' ? 'Today Revenue' : 'আজকের সেলস'}</span>
                      <span className="text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">+12%</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{language === 'en' ? '৳48,500' : '৳৪৮,৫০০'}</p>
                    <p className="text-[11px] text-muted-foreground">{language === 'en' ? '24 Paid Orders' : '২৪টি সাকসেসফুল অর্ডার'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>{language === 'en' ? 'AI Response Rate' : 'এআই রেসপন্স রেট'}</span>
                      <span className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">88%</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{language === 'en' ? '425' : '৪২৫'} <span className="text-xs font-normal text-muted-foreground">msgs</span></p>
                    <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Instant AI Replies' : 'ইনস্ট্যান্ট অটোমেটেড রিপ্লাই'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>{language === 'en' ? 'New Leads' : 'নতুন লিডসমূহ'}</span>
                      <span className="text-secondary font-bold bg-secondary/10 px-1.5 py-0.5 rounded text-[10px]">Today</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-foreground">{language === 'en' ? '18' : '১৮'} <span className="text-xs font-normal text-muted-foreground">contacts</span></p>
                    <p className="text-[11px] text-muted-foreground">{language === 'en' ? 'Auto-captured in CRM' : 'সিআরএমে স্বয়ংক্রিয় সেভ'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                      <span>{language === 'en' ? 'Active Channels' : 'সংযুক্ত চ্যানেল'}</span>
                      <span className="text-emerald-500 font-bold">🟢 Online</span>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="px-2 py-1 bg-[#25D366]/10 text-[#25D366] rounded font-bold text-[10px]">WhatsApp Web</span>
                      <span className="px-2 py-1 bg-[#0088CC]/10 text-[#0088CC] rounded font-bold text-[10px]">Messenger</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Tab 2: Live Omnichannel Inbox Snapshot */}
            {dashboardTab === 'inbox' && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[320px] animate-fade-in-up">
                {/* Left Conversation List */}
                <div className="md:col-span-5 border-r border-border p-3 space-y-2 bg-muted/30">
                  <div className="text-xs font-extrabold text-muted-foreground uppercase px-2 pb-1">Recent Conversations</div>
                  {[
                    { name: 'Tanvir Hossain', text: 'bKash e tk pathaisi, TrxID: 9X82M1', time: '2m ago', active: true, unread: true, channel: 'WhatsApp' },
                    { name: 'Nusrat Jahan', text: 'Blue dress er Size XL stock e ache?', time: '12m ago', active: false, unread: true, channel: 'Messenger' },
                    { name: 'Rafiqul Islam', text: 'Order #1042 delivery update lagbe', time: '1h ago', active: false, unread: false, channel: 'WhatsApp' },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border transition-all cursor-pointer ${item.active ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-card border-border hover:border-primary/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          {item.name}
                          {item.unread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.text}</p>
                    </div>
                  ))}
                </div>

                {/* Right Chat Board */}
                <div className="md:col-span-7 p-4 flex flex-col justify-between bg-surface/50">
                  <div className="space-y-3">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted p-2.5 text-xs">
                        <p className="font-semibold text-foreground">Tanvir Hossain:</p>
                        <p className="text-muted-foreground">আমি ২৪৫০ টাকা bKash সেন্ড মানি করেছি। TrxID: 9X82M1K9</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-white p-2.5 text-xs shadow-sm">
                        <div className="flex items-center gap-1 font-bold text-[10px] text-emerald-200 mb-0.5">
                          <Bot className="w-3 h-3" /> ZiniChat AI Auto-Verified
                        </div>
                        <p>ধন্যবাদ তানভীর ভাই! আপনার bKash পেমেন্ট সফলভাবে ভেরিফাই করা হয়েছে। আপনার অর্ডার #1043 কনফার্ম করা হলো! 📦</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> MFS Auto-Claim Matched</span>
                    <span className="font-bold text-primary">Replying automatically...</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Channel Settings Showcase */}
      <section className="relative overflow-hidden w-full bg-background py-16 lg:py-24 border-b border-border/40">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <span className="inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
              <Globe className="w-3.5 h-3.5" />
              {language === 'en' ? 'Supported Messaging Channels' : 'চ্যানেল কানেক্টিভিটি সুবিধা'}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
              {language === 'en' ? 'Connect All Channels in Seconds' : 'হোয়াটসঅ্যাপ, মেসেঞ্জার ও ইনস্টাগ্রাম — সব এক ছাদের নিচে'}
            </h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {language === 'en' 
                ? 'Connect your business instantly with the Official Meta Cloud API for high-volume, reliable messaging.' 
                : 'হাই-ভলিউম ও বিশ্বস্ত মেসেজিংয়ের জন্য সরাসরি মেটা ক্লাউড এপিআইয়ের মাধ্যমে আপনার ব্যবসাকে কানেক্ট করুন।'}
            </p>
          </div>

          {/* 3 Channel Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* WhatsApp Cloud API */}
            <div className="group rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-[#075E54]/50 hover:shadow-xl hover:shadow-[#075E54]/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                    API
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold border border-primary/20">
                    Official Meta
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">WhatsApp Cloud API</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {language === 'en' 
                    ? 'Official Meta Cloud infrastructure for large scale enterprise broadcasting and verified Green Tick support.' 
                    : 'অফিসিয়াল মেটা ক্লাউড সার্ভার হাই-ভলিউম মেসেজিং ও গ্রিন টিক ভেরিফাইড অ্যাকাউন্টের জন্য।'}
                </p>
              </div>
              <ul className="space-y-2 border-t border-border/60 pt-4 text-xs font-semibold text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Verified Green Badge Ready</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Approved Message Templates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Unlimited High-Speed Queue</li>
              </ul>
            </div>

            {/* Facebook Messenger */}
            <div className="group rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-[#0088CC]/50 hover:shadow-xl hover:shadow-[#0088CC]/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0088CC]/10 text-[#0088CC] flex items-center justify-center font-black text-xl">
                    FB
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#0088CC]/10 text-[#0088CC] text-[10px] font-extrabold border border-[#0088CC]/20">
                    1-Click OAuth
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Facebook Messenger</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {language === 'en' 
                    ? 'Connect Facebook pages directly. Automatically answer inbox messages and post comment inquiries 24/7.' 
                    : 'ফেসবুক পেজ ও কমেন্ট মেসেজ অটো-রিপ্লাই করুন সাথে সাথেই। কাস্টমার কমেন্ট করলেই এআই চ্যাটে নিয়ে আসবে।'}
                </p>
              </div>
              <ul className="space-y-2 border-t border-border/60 pt-4 text-xs font-semibold text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0088CC]" /> Facebook Page Sync</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0088CC]" /> Post Comment Auto-Reply</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#0088CC]" /> Instant Lead Capture</li>
              </ul>
            </div>

            {/* Instagram DM */}
            <div className="group rounded-3xl border border-border bg-card p-6 shadow-sm hover:border-[#E4405F]/50 hover:shadow-xl hover:shadow-[#E4405F]/10 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E4405F]/10 text-[#E4405F] flex items-center justify-center font-black text-xl">
                    IG
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#E4405F]/10 text-[#E4405F] text-[10px] font-extrabold border border-[#E4405F]/20">
                    E-Commerce DM
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Instagram Direct DM</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {language === 'en' 
                    ? 'Automate Instagram DMs and Story Mentions. Send product links and close sales right inside Instagram.' 
                    : 'ইনস্টাগ্রাম মেসেজ ও স্টোরি মেনশন অটোমেশন। কাস্টমারদের ইনবক্সে প্রোডাক্ট ক্যাটালগ পাঠান।'}
                </p>
              </div>
              <ul className="space-y-2 border-t border-border/60 pt-4 text-xs font-semibold text-foreground/80">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E4405F]" /> Story Reply Automation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E4405F]" /> Dynamic Product Cards</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#E4405F]" /> Unified Multi-Account</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Dynamic Features Section */}
      <section id="features" className="relative w-full bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
            {language === 'en' ? 'Everything you need to scale' : 'আপনার ব্যবসার জন্য যা লাগে সব আছে'}
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto sm:text-lg">
            {language === 'en' ? 'Our AI agent handles chats, takes orders, and keeps customers happy.' : 'আমাদের AI এজেন্ট চ্যাট সামলায়, অর্ডার নেয় আর কাস্টমার খুশি রাখে — ২৪/৭।'}
          </p>
        </div>
        
        {/* We keep the dynamic InteractiveFeatureTabs for admin flexibility */}
        <InteractiveFeatureTabs activeFeature={activeFeature} setActiveFeature={setActiveFeature} features={processFeatures(config.featuresJson || [])} />
        
        <div className="text-center mt-12">
          <Link href="/features" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20">
            {language === 'en' ? 'View all features' : 'সব ফিচার দেখুন'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Pricing Preview */}
      <PricingSection isHomepage={true} />

      {/* Bottom CTA */}
      <section className="relative w-full overflow-hidden bg-primary py-20 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-primary-foreground">
            {language === 'en' ? 'Ready to automate your business?' : 'আপনার ব্যবসা স্বয়ংক্রিয় করতে প্রস্তুত?'}
          </h2>
          <p className="text-base text-primary-foreground/80 mb-10 max-w-xl mx-auto sm:text-lg">
            {language === 'en' 
              ? 'Join hundreds of businesses saving time and growing sales with ZiniChat.' 
              : 'ZiniChat-এর মাধ্যমে সময় বাঁচাতে এবং বিক্রি বাড়াতে শত শত ব্যবসার সাথে যোগ দিন।'}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-8 py-4 text-sm font-bold text-foreground transition-all hover:bg-surface-hover hover:scale-105 shadow-xl sm:text-base"
          >
            {language === 'en' ? 'Start your free trial' : 'আপনার ফ্রি ট্রায়াল শুরু করুন'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <PwaInstallBanner />
      
    </div>
  );
}

