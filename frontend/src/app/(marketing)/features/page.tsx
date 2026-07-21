'use client';

import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';
import { InteractiveFeatureTabs, processFeatures } from '@/components/InteractiveFeatureTabs';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const integrations = [
  { name: 'WhatsApp Business', icon: '💬', desc: { en: 'Official API + QR Web', bn: 'অফিসিয়াল API + QR Web' }, color: 'bg-green-500/10 border-green-500/30 text-green-500' },
  { name: 'Meta Messenger', icon: '📘', desc: { en: 'Facebook Page Inbox', bn: 'ফেসবুক পেজ ইনবক্স' }, color: 'bg-blue-500/10 border-blue-500/30 text-blue-500' },
  { name: 'Instagram DM', icon: '📸', desc: { en: 'Direct Message integration', bn: 'ডাইরেক্ট মেসেজ ইন্টিগ্রেশন' }, color: 'bg-pink-500/10 border-pink-500/30 text-pink-500' },
  { name: 'OpenAI', icon: '🤖', desc: { en: 'GPT-4 powered responses', bn: 'GPT-4 চালিত রেসপন্স' }, color: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-500' },
  { name: 'Anthropic Claude', icon: '🧠', desc: { en: 'Claude AI integration', bn: 'Claude AI ইন্টিগ্রেশন' }, color: 'bg-purple-500/10 border-purple-500/30 text-purple-500' },
  { name: 'Supabase', icon: '🗄️', desc: { en: 'Scalable PostgreSQL DB', bn: 'স্কেলেবল PostgreSQL DB' }, color: 'bg-teal-500/10 border-teal-500/30 text-teal-500' },
];

export default function FeaturesPage() {
  const { language } = useLanguage();
  const [activeFeature, setActiveFeature] = useState(0);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/landing-page/config`)
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const dynamicFeatures = processFeatures(config?.featuresJson || []);

  return (
    <div className="flex flex-col items-center w-full overflow-hidden">

      {/* Hero Section - Alapai Style */}
      <section className="relative w-full bg-muted pb-16 pt-12 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 w-[40rem] h-[40rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"></div>
          <div className="absolute right-1/4 bottom-0 w-[30rem] h-[30rem] translate-y-1/2 rounded-full bg-secondary/10 blur-[100px]"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:text-sm mb-6">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="inline-flex w-2 h-2 rounded-full bg-primary"></span>
            </span>
            {language === 'en' ? 'Full Platform Overview' : 'সম্পূর্ণ প্ল্যাটফর্ম ওভারভিউ'}
          </div>
          
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            {language === 'en' ? (
              <>Everything your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">business needs</span></>
            ) : (
              <>আপনার <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ব্যবসার সব কিছু</span> এক জায়গায়</>
            )}
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {language === 'en'
              ? 'ZiniChat combines AI automation, omnichannel messaging, CRM, and e-commerce into one powerful platform — purpose-built for modern businesses.'
              : 'ZiniChat এআই অটোমেশন, অমনিচ্যানেল মেসেজিং, CRM এবং ই-কমার্স একটি শক্তিশালী প্ল্যাটফর্মে একত্রিত করে — যা আধুনিক ব্যবসার জন্য তৈরি।'}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 sm:text-base w-full sm:w-auto" href="/signup">
              <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
              {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Tabs Section */}
      <section className="relative w-full bg-background py-16">
        <InteractiveFeatureTabs activeFeature={activeFeature} setActiveFeature={setActiveFeature} features={dynamicFeatures} />
      </section>

      {/* All Features Grid - Alapai Style */}
      <section className="relative overflow-hidden w-full bg-muted py-16 lg:py-24 border-y border-border/40">
        <div className="pointer-events-none absolute -left-24 top-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              {language === 'en' ? 'Features List' : 'ফিচার সমূহ'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {language === 'en' ? 'All Features at a Glance' : 'এক নজরে সব ফিচার'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {language === 'en' ? 'Click any feature to explore in detail' : 'বিস্তারিত দেখতে যেকোনো ফিচারে ক্লিক করুন'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dynamicFeatures.map((feature: any, idx: number) => (
              <button
                key={feature.id}
                onClick={() => {
                  setActiveFeature(idx);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className={`text-left p-6 sm:p-8 rounded-2xl bg-card border border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 group`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                  <div className={`text-xl sm:text-2xl ${feature.iconColor}`}>{feature.icon}</div>
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors text-foreground">
                  {language === 'en' ? feature.title.en : feature.title.bn}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                  {language === 'en' ? feature.description.en : feature.description.bn}
                </p>
                <div className={`mt-5 text-sm font-semibold ${feature.iconColor} flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity`}>
                  {language === 'en' ? 'Learn more' : 'আরো জানুন'} <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative w-full bg-background py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">
              {language === 'en' ? 'Seamless Integrations' : 'নিরবচ্ছিন্ন ইন্টিগ্রেশন'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {language === 'en' ? 'Connect with the tools you already use' : 'আপনার পরিচিত টুলসের সাথে সংযুক্ত করুন'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
            {integrations.map((intg, idx) => (
              <div key={idx} className={`${intg.color} border bg-card/50 backdrop-blur-sm rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5`}>
                <div className="text-3xl sm:text-4xl mb-3 flex justify-center animate-float" style={{ animationDelay: `${idx * 0.1}s` }}>{intg.icon}</div>
                <div className="text-sm font-bold text-foreground mb-1">{intg.name}</div>
                <div className="text-xs text-muted-foreground">{language === 'en' ? intg.desc.en : intg.desc.bn}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Alapai Style */}
      <section className="relative w-full overflow-hidden bg-primary py-20 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-primary-foreground">
            {language === 'en' ? 'Ready to transform your business?' : 'আপনার ব্যবসা রূপান্তর করতে প্রস্তুত?'}
          </h2>
          <p className="text-base text-primary-foreground/80 mb-10 max-w-xl mx-auto sm:text-lg">
            {language === 'en'
              ? 'Start your free trial today. No credit card required. Setup in minutes.'
              : 'আজই বিনামূল্যে শুরু করুন। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই। মিনিটের মধ্যে সেটআপ।'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-background px-8 py-4 text-sm font-bold text-foreground transition-all hover:bg-surface-hover hover:scale-105 shadow-xl sm:text-base w-full sm:w-auto"
            >
              {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 px-8 py-4 text-sm font-bold text-primary-foreground backdrop-blur-sm transition-all hover:bg-primary-foreground/20 sm:text-base w-full sm:w-auto"
            >
              {language === 'en' ? 'Talk to Sales' : 'সেলসের সাথে কথা বলুন'}
            </Link>
          </div>
        </div>
      </section>
      
    </div>
  );
}


