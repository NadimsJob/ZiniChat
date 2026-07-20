'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { useCurrency } from '@/components/CurrencyProvider';
import Link from 'next/link';
import { Bot, ShieldCheck, ArrowRight, CheckCircle2, MessageSquare, Zap, Globe, Users, ShoppingCart, Star } from 'lucide-react';
import { InteractiveFeatureTabs, processFeatures } from '@/components/InteractiveFeatureTabs';

function WhatsAppBotMockup({ language }: { language: string }) {
  return (
    <div className="w-full max-w-sm bg-surface border border-surface-hover rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-700">
      {/* Chat Header */}
      <div className="bg-surface-hover px-4 py-3 border-b border-surface-hover flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm">ZiniChat AI Assistant</h4>
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> {language === 'en' ? 'Online • Automated' : 'অনলাইন • স্বয়ংক্রিয়'}
          </p>
        </div>
      </div>
      
      {/* Chat Body */}
      <div className="bg-[#EFEAE2]/80 backdrop-blur-md p-4 space-y-4 h-[320px] overflow-hidden flex flex-col justify-end relative">
        
        <div className="flex flex-col gap-1 w-full max-w-[85%] self-end">
          <span className="text-[10px] text-zinc-400 self-end mr-1 mb-0.5">{language === 'en' ? 'Customer' : 'গ্রাহক'}</span>
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm text-sm shadow-sm relative z-10">
            {language === 'en' ? 'I need help with my recent order #12345.' : 'আমার অর্ডার #12345 সম্পর্কে সাহায্য প্রয়োজন।'}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full max-w-[85%] self-start animate-in fade-in slide-in-from-left-4 duration-500 delay-300 fill-mode-both">
          <span className="text-[10px] text-zinc-400 self-start ml-1 mb-0.5 text-primary font-medium">{language === 'en' ? 'Auto Reply' : 'অটো রিপ্লাই'}</span>
          <div className="bg-white border border-surface-hover p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm relative z-10 text-zinc-800">
            {language === 'en' ? 'Hello! I found your order #12345. It is currently out for delivery and will arrive by 5 PM today. 🚚' : 'হ্যালো! আমি আপনার অর্ডার #12345 খুঁজে পেয়েছি। এটি ডেলিভারির জন্য বের হয়েছে এবং আজ বিকাল ৫ টার মধ্যে পৌঁছে যাবে। 🚚'}
          </div>
        </div>

        <div className="flex flex-col gap-1 w-full max-w-[85%] self-start animate-in fade-in slide-in-from-left-4 duration-500 delay-1000 fill-mode-both">
          <div className="bg-white border border-surface-hover p-3 rounded-2xl rounded-tl-sm text-sm shadow-sm relative z-10 flex flex-col gap-2 text-zinc-800">
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
  const { formatBDT } = useCurrency();
  const [activeFeature, setActiveFeature] = useState(0);
  const [config, setConfig] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
      
      {/* Decorative Background Blobs for Professional Colorful Tech Feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="absolute top-[60%] left-[10%] w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Interactive Mouse Glow */}
      <div 
        className="fixed top-0 left-0 w-96 h-96 bg-secondary/15 rounded-full blur-[120px] pointer-events-none transition-transform duration-700 ease-out z-0"
        style={{ transform: `translate(${mousePos.x - 192}px, ${mousePos.y - 192}px)` }}
      />
      
      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto py-12 lg:py-20 px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center relative z-10">

        <div className="flex flex-col items-start text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs font-bold mb-6 shadow-[0_0_15px_-3px_var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            {language === 'en' ? 'Omnichannel AI Assistant Platform →' : 'ওমনিচ্যানেল এআই অ্যাসিস্ট্যান্ট প্ল্যাটফর্ম →'}
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
              className="rounded-full bg-surface border border-surface-hover px-8 py-4 text-sm font-semibold text-foreground hover:bg-surface-hover transition-all"
            >
              {language === 'en' ? 'View Demo' : 'ডেমো দেখুন'}
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            {language === 'en' ? 'No Credit Card Required • Setup in 10 minutes' : 'কোনো ক্রেডিট কার্ডের প্রয়োজন নেই • ১০ মিনিটে সেটআপ'}
          </p>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end lg:-translate-y-12">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-tr from-primary via-purple-500 to-secondary rounded-full blur-[120px] opacity-40 pointer-events-none" />
          <WhatsAppBotMockup language={language} />
        </div>
      </section>

      {/* Logos & Social Proof */}
      <section className="w-full border-y border-surface-hover bg-surface/30 backdrop-blur-md py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-8">
            {language === 'en' ? 'Trusted by 500+ innovative businesses worldwide' : 'বিশ্বব্যাপী ৫০০+ উদ্ভাবনী ব্যবসার আস্থার প্রতীক'}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Using text logos for now since actual images might be missing */}
            <div className="text-2xl font-black font-serif">Acme Corp</div>
            <div className="text-xl font-bold tracking-tighter">TechFlow</div>
            <div className="text-2xl font-extrabold italic">Globex</div>
            <div className="text-2xl font-bold uppercase tracking-widest">Stark</div>
            <div className="text-xl font-bold rounded bg-zinc-800 px-2 py-1 text-white">UMBRELLA</div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight mb-4">
            {language === 'en' ? 'How it Works' : 'এটি কীভাবে কাজ করে'}
          </h2>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            {language === 'en' ? 'Get your AI assistant up and running in three simple steps.' : 'তিনটি সহজ ধাপে আপনার এআই অ্যাসিস্ট্যান্ট চালু করুন।'}
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-purple-500/30 to-secondary/10 -translate-y-1/2 -z-10" />
          
          <div className="bg-surface border border-surface-hover hover:border-primary/50 hover:shadow-[0_0_30px_-10px_var(--primary)] transition-all duration-300 p-8 rounded-3xl text-center relative shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-glow relative z-10 border-4 border-background group-hover:scale-110 transition-transform">1</div>
            <h3 className="text-xl font-bold mb-3">{language === 'en' ? 'Connect Channels' : 'চ্যানেল কানেক্ট করুন'}</h3>
            <p className="text-zinc-500 text-sm">
              {language === 'en' ? 'Link your WhatsApp Business, Facebook Page, or Instagram account with a single click.' : 'আপনার হোয়াটসঅ্যাপ, ফেসবুক পেজ বা ইনস্টাগ্রাম অ্যাকাউন্ট এক ক্লিকে লিঙ্ক করুন।'}
            </p>
          </div>
          
          <div className="bg-surface border border-surface-hover hover:border-purple-500/50 hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.5)] transition-all duration-300 p-8 rounded-3xl text-center relative shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-[0_0_15px_-3px_rgba(168,85,247,0.5)] relative z-10 border-4 border-background group-hover:scale-110 transition-transform">2</div>
            <h3 className="text-xl font-bold mb-3">{language === 'en' ? 'Train the AI' : 'এআই ট্রেইন করুন'}</h3>
            <p className="text-zinc-500 text-sm">
              {language === 'en' ? 'Upload your products, services, and FAQs. The AI learns your business inside out instantly.' : 'আপনার প্রোডাক্ট, সার্ভিস এবং FAQ আপলোড করুন। এআই সাথে সাথেই আপনার ব্যবসা শিখে নেয়।'}
            </p>
          </div>
          
          <div className="bg-surface border border-surface-hover hover:border-secondary/50 hover:shadow-[0_0_30px_-10px_var(--secondary)] transition-all duration-300 p-8 rounded-3xl text-center relative shadow-lg group">
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="w-16 h-16 bg-secondary text-white rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6 shadow-[0_0_15px_-3px_var(--secondary)] relative z-10 border-4 border-background group-hover:scale-110 transition-transform">3</div>
            <h3 className="text-xl font-bold mb-3">{language === 'en' ? 'Automate & Grow' : 'স্বয়ংক্রিয় করুন এবং বাড়ান'}</h3>
            <p className="text-zinc-500 text-sm">
              {language === 'en' ? 'Watch as the AI answers questions, qualifies leads, and closes sales 24/7 on autopilot.' : 'এআই কীভাবে স্বয়ংক্রিয়ভাবে উত্তর দেয়, লিড কোয়ালিফাই করে এবং সেলস ক্লোজ করে তা দেখুন।'}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-surface-hover/30 border-y border-surface-hover py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-primary via-purple-600 to-secondary bg-clip-text text-transparent pb-1">
            {language === 'en' ? 'Everything you need to scale' : 'স্কেল করার জন্য প্রয়োজনীয় সবকিছু'}
          </h2>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
            {language === 'en' ? 'A complete suite of tools designed to replace multiple expensive software subscriptions.' : 'একাধিক ব্যয়বহুল সফটওয়্যার সাবস্ক্রিপশন প্রতিস্থাপনের জন্য ডিজাইন করা সম্পূর্ণ টুলস।'}
          </p>
        </div>
        <InteractiveFeatureTabs activeFeature={activeFeature} setActiveFeature={setActiveFeature} features={processFeatures(config.featuresJson || [])} />
        <div className="text-center mt-12">
          <Link href="/features" className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
            {language === 'en' ? 'View all features' : 'সব ফিচার দেখুন'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="w-full max-w-5xl mx-auto py-24 px-4 text-center">
        <div className="flex justify-center mb-6 text-orange-500">
          <Star className="w-6 h-6 fill-current" />
          <Star className="w-6 h-6 fill-current" />
          <Star className="w-6 h-6 fill-current" />
          <Star className="w-6 h-6 fill-current" />
          <Star className="w-6 h-6 fill-current" />
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">
          {language === 'en' 
            ? `"ZiniChat completely transformed our customer support. We went from answering the same questions 100 times a day to having AI handle 80% of our inquiries instantly."` 
            : `"ZiniChat আমাদের কাস্টমার সাপোর্টকে সম্পূর্ণ বদলে দিয়েছে। দিনে ১০০ বার একই প্রশ্নের উত্তর দেওয়ার বদলে এখন AI তাৎক্ষণিকভাবে ৮০% অনুসন্ধানের উত্তর দেয়।"`}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-primary overflow-hidden">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <div className="font-bold">Sarah Rahman</div>
            <div className="text-sm text-zinc-500">Founder, E-Shop BD</div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="w-full py-24 px-4 relative overflow-hidden bg-surface-hover/30 border-y border-surface-hover">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {language === 'en' ? 'Simple, transparent pricing' : 'সহজ ও স্বচ্ছ প্রাইসিং'}
            </h2>
            <p className="text-lg text-zinc-500">
              {language === 'en' ? 'Start for free, upgrade when you need more power.' : 'বিনামূল্যে শুরু করুন, বেশি পাওয়ার দরকার হলে আপগ্রেড করুন।'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-5xl">
            {plans.map((plan: any, idx: number) => (
              <div key={plan.id} className={`p-8 rounded-3xl bg-background border flex flex-col shadow-xl transition-all duration-300 hover:-translate-y-2 ${plan.isPopular ? 'border-primary/50 shadow-[0_0_40px_-15px_var(--primary)] relative md:-translate-y-4 hover:!translate-y-[-24px]' : 'border-surface-hover'}`}>
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-secondary text-white text-xs font-bold py-1.5 px-6 rounded-full uppercase tracking-wider shadow-md whitespace-nowrap">
                    {language === 'en' ? 'Most Popular' : 'জনপ্রিয়'}
                  </div>
                )}
                
                <h3 className="text-lg font-bold text-zinc-500 mb-2">{language === 'en' ? plan.name : (plan.nameBn || plan.name)}</h3>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight">{formatBDT(plan.priceMonthlyBdt)}</span>
                  <span className="text-zinc-500 font-medium">/ {language === 'en' ? 'mo' : 'মাস'}</span>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-zinc-300">{language === 'en' ? 'Full Omnichannel Inbox' : 'পূর্ণ অমনিচ্যানেল ইনবক্স'}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-zinc-300">{language === 'en' ? 'Unlimited Contacts' : 'আনলিমিটেড কন্টাক্টস'}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-zinc-300">{plan.messageQuota === -1 ? 'Unlimited' : plan.messageQuota} {language === 'en' ? 'Messages/mo' : 'মেসেজ/মাস'}</span>
                  </li>
                </ul>

                <Link 
                  href="/signup" 
                  className={`w-full py-4 rounded-xl font-bold text-sm text-center transition-all ${
                    plan.isPopular 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-glow' 
                      : 'bg-surface-hover text-foreground hover:bg-zinc-800'
                  }`}
                >
                  {language === 'en' ? 'Get Started' : 'শুরু করুন'}
                </Link>
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/pricing" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
              {language === 'en' ? 'View full feature comparison' : 'সম্পূর্ণ ফিচার তুলনা দেখুন'} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="w-full max-w-5xl mx-auto px-4 py-32 text-center">
        <div className="relative p-12 md:p-20 rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-surface-hover overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              {language === 'en' ? 'Ready to automate your business?' : 'আপনার ব্যবসা স্বয়ংক্রিয় করতে প্রস্তুত?'}
            </h2>
            <p className="text-lg text-zinc-500 mb-10 max-w-xl mx-auto">
              {language === 'en' 
                ? 'Join 500+ businesses saving time and growing sales with ZiniChat.' 
                : 'ZiniChat-এর মাধ্যমে সময় বাঁচাতে এবং বিক্রি বাড়াতে ৫০০+ ব্যবসার সাথে যোগ দিন।'}
            </p>
            <div className="flex justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-primary to-secondary px-10 py-5 text-base font-bold text-white hover:opacity-90 transition-all hover:scale-105 shadow-glow inline-flex items-center gap-2"
              >
                {language === 'en' ? 'Start your 14-day free trial' : 'আপনার ১৪ দিনের ফ্রি ট্রায়াল শুরু করুন'} <Zap className="w-5 h-5 fill-current" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-zinc-500 font-medium">
              {language === 'en' ? 'No Credit Card Required • Cancel Anytime' : 'কোনো ক্রেডিট কার্ডের প্রয়োজন নেই • যেকোনো সময় বাতিল করুন'}
            </p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
