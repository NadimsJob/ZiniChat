'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import Link from 'next/link';

function WhatsAppBotMockup({ language }: { language: string }) {
  return (
    <div className="w-full max-w-sm bg-surface border border-surface-hover rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">
      {/* Chat Header */}
      <div className="bg-surface-hover px-4 py-3 border-b border-surface-hover flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </div>
        <div>
          <h4 className="font-bold text-sm">ZiniChat Business Bot</h4>
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {language === 'en' ? 'Online • Automated' : 'অনলাইন • স্বয়ংক্রিয়'}
          </p>
        </div>
      </div>
      
      {/* Chat Body */}
      <div className="bg-[#f0f2f5] dark:bg-[#0c0c0e] p-4 space-y-4 h-[320px] overflow-hidden flex flex-col justify-end relative">
        
        <div className="flex flex-col gap-1 w-full max-w-[85%] self-end">
          <span className="text-[10px] text-zinc-400 self-end mr-1 mb-0.5">{language === 'en' ? 'Customer' : 'গ্রাহক'}</span>
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm relative z-10">
            {language === 'en' ? 'I need help with my recent order #12345.' : 'আমার অর্ডার #12345 সম্পর্কে সাহায্য প্রয়োজন।'}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full max-w-[85%] self-start animate-in fade-in slide-in-from-left-4 duration-500 delay-300 fill-mode-both">
          <span className="text-[10px] text-zinc-400 self-start ml-1 mb-0.5 text-primary font-medium">{language === 'en' ? 'Auto Reply' : 'অটো রিপ্লাই'}</span>
          <div className="bg-white dark:bg-surface border border-surface-hover p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm relative z-10">
            {language === 'en' ? 'Hello! I found your order #12345. It is currently out for delivery and will arrive by 5 PM today. 🚚' : 'হ্যালো! আমি আপনার অর্ডার #12345 খুঁজে পেয়েছি। এটি ডেলিভারির জন্য বের হয়েছে এবং আজ বিকাল ৫ টার মধ্যে পৌঁছে যাবে। 🚚'}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full max-w-[85%] self-start animate-in fade-in slide-in-from-left-4 duration-500 delay-1000 fill-mode-both">
          <div className="bg-white dark:bg-surface border border-surface-hover p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm relative z-10 flex flex-col gap-2">
            <span>{language === 'en' ? 'Would you like to track the driver live?' : 'আপনি কি রাইডারকে লাইভ ট্র্যাক করতে চান?'}</span>
            <button className="bg-primary/10 text-primary font-medium py-1.5 rounded-lg text-xs hover:bg-primary/20 transition-colors">
              {language === 'en' ? 'Yes, track order' : 'হ্যাঁ, ট্র্যাক করুন'}
            </button>
            <button className="bg-surface-hover font-medium py-1.5 rounded-lg text-xs hover:bg-surface-hover/80 transition-colors">
              {language === 'en' ? 'No, thanks' : 'না, ধন্যবাদ'}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-surface-hover/50 p-3 flex gap-2 items-center">
        <div className="flex-1 bg-background border border-surface-hover rounded-full px-4 py-2.5 text-xs text-zinc-500 flex items-center">
          {language === 'en' ? 'Type a message...' : 'একটি মেসেজ লিখুন...'}
        </div>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow shrink-0">
          <svg className="w-4 h-4 translate-x-px translate-y-px" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const { formatBDT, formatNumber } = useCurrency();
  const [config, setConfig] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`).then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/plans`).then(res => res.ok ? res.json() : []),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/packages/addons`).then(res => res.ok ? res.json() : [])
    ])
    .then(([configData, plansData, addonsData]) => {
      setConfig(configData);
      setPlans(plansData || []);
      setAddons(addonsData || []);
      setLoading(false);
    })
    .catch(err => {
      // Instead of console.error which triggers Next.js dev overlay, we set error state
      console.warn("Could not fetch data from backend. Is the server running?", err.message);
      setError(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
          The frontend could not connect to the backend server. Please make sure the NestJS backend and the Supabase database are running.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center overflow-hidden relative">
      
      {/* Interactive Mouse Glow */}
      <div 
        className="fixed top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none transition-transform duration-700 ease-out z-0"
        style={{ transform: `translate(${mousePos.x - 192}px, ${mousePos.y - 192}px)` }}
      />
      
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto py-20 lg:py-32 px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">

        <div className="flex flex-col items-start text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-bold mb-6 shadow-[0_0_15px_-3px_var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            WhatsApp Business API Platform →
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            {language === 'en' ? config.heroTitle : (config.heroTitleBn || config.heroTitle)}
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 mb-10 max-w-lg leading-relaxed">
            {language === 'en' ? config.heroSubtitle : (config.heroSubtitleBn || config.heroSubtitle)}
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <Link
              href="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-sm font-bold text-white hover:opacity-90 transition-all hover:scale-105 shadow-glow"
            >
              {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
            </Link>
            <Link
              href="/contact"
              className="rounded-full bg-surface/50 backdrop-blur-sm border border-surface-hover px-8 py-4 text-sm font-semibold text-foreground hover:bg-surface-hover transition-all"
            >
              {language === 'en' ? 'View Demo' : 'ডেমো দেখুন'}
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500 font-medium">
            {language === 'en' ? 'No Credit Card Required • Trusted by 500+ businesses' : 'কোনো ক্রেডিট কার্ডের প্রয়োজন নেই • ৫০০+ ব্যবসার আস্থার প্রতীক'}
          </p>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end">
          <WhatsAppBotMockup language={language} />
        </div>
      </section>

      {/* Key Metrics Strip */}
      <section className="w-full border-y border-surface-hover bg-surface/30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-surface-hover/50">
          <div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{language === 'en' ? '10M+' : '১ কোটি+'}</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{language === 'en' ? 'Messages Sent' : 'মেসেজ পাঠানো হয়েছে'}</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{language === 'en' ? '500+' : '৫০০+'}</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{language === 'en' ? 'Active Clients' : 'অ্যাক্টিভ ক্লায়েন্ট'}</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{language === 'en' ? '99.9%' : '৯৯.৯%'}</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{language === 'en' ? 'Uptime SLA' : 'আপটাইম এসএলএ'}</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-foreground mb-1">{language === 'en' ? '98.5%' : '৯৮.৫%'}</div>
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{language === 'en' ? 'Delivery Rate' : 'ডেলিভারি রেট'}</div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="w-full max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {language === 'en' ? 'Everything in one platform' : 'সবকিছু এক প্ল্যাটফর্মে'}
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-2xl">
            {language === 'en' ? 'Built for scale, designed for simplicity. Engage your customers across every channel.' : 'স্কেলের জন্য তৈরি, সহজে ব্যবহারের জন্য ডিজাইন করা।'}
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-16">
          {config.featuresJson?.map((feature: any, idx: number) => (
            <div key={idx} className="flex gap-6 group">
              <div className="text-4xl font-black text-surface-hover group-hover:text-secondary transition-colors duration-500">
                {(idx + 1).toString().padStart(2, '0')}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{language === 'en' ? feature.title?.en || feature.title : feature.title?.bn || feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed text-sm">{language === 'en' ? feature.description?.en || feature.description : feature.description?.bn || feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="w-full py-24 px-4 relative">
        <div className="absolute inset-0 bg-surface-hover/30 -skew-y-3 z-0" />
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-16 text-center">
            {language === 'en' ? 'Simple, transparent pricing' : 'সহজ ও স্বচ্ছ প্রাইসিং'}
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
            {plans.map((plan: any, idx: number) => (
              <div key={plan.id} className={`p-8 rounded-3xl bg-background border flex flex-col shadow-xl transition-all duration-300 hover:-translate-y-2 ${plan.isPopular ? 'border-primary/50 shadow-glow relative' : 'border-surface-hover'}`}>
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-1.5 px-4 rounded-full uppercase tracking-wider shadow-md">
                    {language === 'en' ? 'Most Popular' : 'জনপ্রিয়'}
                  </div>
                )}
                
                <h3 className="text-lg font-bold text-zinc-500 mb-4">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</h3>
                <div className="my-6">
                  <span className="text-5xl font-extrabold">{formatBDT(plan.priceMonthlyBdt)}</span>
                  <span className="text-zinc-500 text-sm ml-1">/ {language === 'en' ? 'mo' : 'মাস'}</span>
                </div>
                
                <Link href="/signup" className={`w-full py-3 rounded-full text-sm font-bold text-center transition-all mb-8 ${plan.isPopular ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-glow' : 'bg-surface-hover hover:bg-surface text-foreground'}`}>
                  {language === 'en' ? 'Get Started' : 'শুরু করুন'}
                </Link>

                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">{language === 'en' ? "What's included" : "যা যা থাকছে"}</div>
                <ul className="space-y-4 w-full text-left text-sm font-medium">
                  <li className="flex items-start gap-3 text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    {formatNumber(plan.seatLimit)} {language === 'en' ? 'Team Members' : 'টিম মেম্বার'}
                  </li>
                  <li className="flex items-start gap-3 text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    {formatNumber(plan.messageQuota)} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}
                  </li>
                  <li className="flex items-start gap-3 text-zinc-300">
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    {formatNumber(plan.aiQuota)} {language === 'en' ? 'AI Responses/mo' : 'এআই রেসপন্স/মাস'}
                  </li>
                  {plan.featuresJson?.map((f: any, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-zinc-300">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      {language === 'en' ? f.en : (f.bn || f.en)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {addons.length > 0 && (
            <div className="mt-24 w-full max-w-4xl">
              <div className="text-center mb-12">
                <h3 className="text-2xl font-bold tracking-tight">
                  {language === 'en' ? 'Available Add-ons' : 'অ্যাড-অন সমূহ'}
                </h3>
                <p className="mt-2 text-zinc-500 text-sm">
                  {language === 'en' ? 'Need more limits? Purchase add-ons anytime.' : 'আরও লিমিট প্রয়োজন? যেকোনো সময় অ্যাড-অন কিনতে পারবেন।'}
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {addons.map((addon) => (
                  <div key={addon.id} className="bg-surface border border-surface-hover p-6 rounded-2xl text-center">
                    <h4 className="font-bold text-lg">{language === 'en' ? addon.name : (addon.nameBn || addon.name)}</h4>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{formatNumber(addon.value)} {addon.type.replace('_', ' ')}</p>
                    <div className="text-2xl font-black mt-4 text-secondary">{formatBDT(addon.priceBdt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
