'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import Link from 'next/link';
import { Bot, ShieldCheck, ArrowRight, CheckCircle2, MessageSquare, Zap, Globe, Users, ShoppingCart, Star, Send, CheckCheck } from 'lucide-react';
import { InteractiveFeatureTabs, processFeatures } from '@/components/InteractiveFeatureTabs';
import { PricingSection } from '@/components/PricingSection';

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
  const [activeFeature, setActiveFeature] = useState(0);
  const [config, setConfig] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`).then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`).then(res => res.ok ? res.json() : [])
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
            
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl text-foreground">
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
      </section>

      {/* Trusted By - Alapai Style Grid */}
      <section className="relative overflow-hidden w-full bg-background py-16 lg:py-24 border-y border-border/40">
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground shadow-sm">
            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
            {language === 'en' ? 'Trusted by innovative businesses' : 'সারা বাংলাদেশে বিশ্বস্ত'}
          </span>
          <h2 className="mx-auto mt-6 max-w-2xl text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {language === 'en' ? 'Growing businesses are scaling with ' : 'বাড়ন্ত ব্যবসাগুলো এখন আমাদের সাথেই '}
            <span className="text-accent underline decoration-accent/30 underline-offset-4">{language === 'en' ? 'us' : 'বিক্রি করছে'}</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg font-medium">
            {language === 'en' ? 'From E-commerce to Services, businesses everywhere are using ZiniChat to automate sales.' : 'ই-কমার্স থেকে শুরু করে বিভিন্ন সার্ভিস — অসংখ্য ব্যবসা এগিয়ে চলছে ZiniChat-এর সাথে।'}
          </p>
          
          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[
              { name: 'Acme Corp', icon: '🚀' },
              { name: 'TechFlow', icon: '⚡' },
              { name: 'Globex', icon: '🌍' },
              { name: 'Stark Ind.', icon: '🛡️' }
            ].map((company, idx) => (
              <div key={idx} className="group flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-border bg-card py-8 px-4 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 cursor-default">
                <div className="flex w-12 h-12 items-center justify-center rounded-full bg-muted group-hover:bg-accent/10 transition-colors">
                  <span className="text-2xl">{company.icon}</span>
                </div>
                <span className="text-lg font-extrabold text-foreground/70 group-hover:text-foreground transition-colors">{company.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="relative overflow-hidden w-full bg-muted py-16 lg:py-24">
        <div className="pointer-events-none absolute -left-24 top-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              {language === 'en' ? 'How it Works' : 'যেভাবে কাজ করে'}
            </span>
            <h2 className="mb-3 mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {language === 'en' ? 'Setup in minutes, Automate forever' : 'মিনিটেই চালু, তিন ধাপেই বিক্রি'}
            </h2>
          </div>
          
          <div className="relative grid gap-6 md:grid-cols-3 md:gap-5 lg:gap-8">
            <div className="hidden md:block absolute top-11 inset-x-[16.6%] h-px bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40" />
            
            <div className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex w-12 h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <Globe className="w-6 h-6" />
                </span>
                <span className="text-5xl font-black text-muted/50 group-hover:text-primary/10 transition-colors">01</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{language === 'en' ? 'Connect Channels' : 'চ্যানেল কানেক্ট করুন'}</h3>
              <p className="text-sm text-muted-foreground">{language === 'en' ? 'Link your WhatsApp Business, Facebook Page, or Instagram account with a single click.' : 'আপনার হোয়াটসঅ্যাপ, ফেসবুক পেজ বা ইনস্টাগ্রাম অ্যাকাউন্ট এক ক্লিকে লিঙ্ক করুন।'}</p>
            </div>
            
            <div className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex w-12 h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <Bot className="w-6 h-6" />
                </span>
                <span className="text-5xl font-black text-muted/50 group-hover:text-primary/10 transition-colors">02</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{language === 'en' ? 'Train the AI' : 'এআই ট্রেইন করুন'}</h3>
              <p className="text-sm text-muted-foreground">{language === 'en' ? 'Upload your products and FAQs. The AI learns your business instantly.' : 'আপনার প্রোডাক্ট এবং FAQ আপলোড করুন। এআই সাথে সাথেই আপনার ব্যবসা শিখে নেয়।'}</p>
            </div>
            
            <div className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex w-12 h-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <Zap className="w-6 h-6" />
                </span>
                <span className="text-5xl font-black text-muted/50 group-hover:text-primary/10 transition-colors">03</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{language === 'en' ? 'Automate & Grow' : 'স্বয়ংক্রিয় করুন'}</h3>
              <p className="text-sm text-muted-foreground">{language === 'en' ? 'Watch as the AI answers questions and closes sales 24/7 on autopilot.' : 'এআই কীভাবে স্বয়ংক্রিয়ভাবে উত্তর দেয় এবং সেলস ক্লোজ করে তা দেখুন।'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Features Section */}
      <section id="features" className="relative w-full bg-background py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
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
      
    </div>
  );
}
