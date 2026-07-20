'use client';

import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';
import { InteractiveFeatureTabs, processFeatures } from '@/components/InteractiveFeatureTabs';
import { useEffect, useState } from 'react';


const integrations = [
  { name: 'WhatsApp Business', icon: '💬', desc: { en: 'Official API + QR Web', bn: 'অফিসিয়াল API + QR Web' }, color: 'bg-green-500/10 border-green-500/30' },
  { name: 'Meta Messenger', icon: '📘', desc: { en: 'Facebook Page Inbox', bn: 'ফেসবুক পেজ ইনবক্স' }, color: 'bg-blue-500/10 border-blue-500/30' },
  { name: 'Instagram DM', icon: '📸', desc: { en: 'Direct Message integration', bn: 'ডাইরেক্ট মেসেজ ইন্টিগ্রেশন' }, color: 'bg-pink-500/10 border-pink-500/30' },
  { name: 'OpenAI', icon: '🤖', desc: { en: 'GPT-4 powered responses', bn: 'GPT-4 চালিত রেসপন্স' }, color: 'bg-zinc-500/10 border-zinc-500/30' },
  { name: 'Anthropic Claude', icon: '🧠', desc: { en: 'Claude AI integration', bn: 'Claude AI ইন্টিগ্রেশন' }, color: 'bg-purple-500/10 border-purple-500/30' },
  { name: 'Supabase', icon: '🗄️', desc: { en: 'Scalable PostgreSQL DB', bn: 'স্কেলেবল PostgreSQL DB' }, color: 'bg-teal-500/10 border-teal-500/30' },
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
    <div className="flex flex-col items-center overflow-hidden">

      {/* Hero */}
      <section className="w-full relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {language === 'en' ? 'Full Platform Overview' : 'সম্পূর্ণ প্ল্যাটফর্ম ওভারভিউ'}
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              {language === 'en' ? (
                <>Everything your <br className="hidden md:block lg:hidden" /><span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">business needs</span></>
              ) : (
                <>আপনার <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ব্যবসার সব কিছু</span> এক জায়গায়</>
              )}
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 max-w-xl mx-auto leading-relaxed">
              {language === 'en'
                ? 'ZiniChat combines AI automation, omnichannel messaging, CRM, and e-commerce into one powerful platform — purpose-built for modern businesses.'
                : 'ZiniChat এআই অটোমেশন, অমনিচ্যানেল মেসেজিং, CRM এবং ই-কমার্স একটি শক্তিশালী প্ল্যাটফর্মে একত্রিত করে — যা আধুনিক ব্যবসার জন্য তৈরি।'}
            </p>
          </div>
          

        </div>
      </section>

      {/* Interactive Tabs Section */}
      <InteractiveFeatureTabs activeFeature={activeFeature} setActiveFeature={setActiveFeature} features={dynamicFeatures} />

      {/* All Features Grid */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            {language === 'en' ? 'All Features at a Glance' : 'এক নজরে সব ফিচার'}
          </h2>
          <p className="text-zinc-500">
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
              className={`text-left p-6 rounded-2xl bg-surface border border-surface-hover ${feature.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} ${feature.iconColor} flex items-center justify-center mb-4`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                {language === 'en' ? feature.title.en : feature.title.bn}
              </h3>
              <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2">
                {language === 'en' ? feature.description.en : feature.description.bn}
              </p>
              <div className={`mt-4 text-xs font-bold ${feature.iconColor} flex items-center gap-1`}>
                {language === 'en' ? 'Learn more' : 'আরো জানুন'} →
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="w-full bg-surface-hover/30 border-y border-surface-hover py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">
              {language === 'en' ? 'Seamless Integrations' : 'নিরবচ্ছিন্ন ইন্টিগ্রেশন'}
            </h2>
            <p className="text-zinc-500 text-sm">
              {language === 'en' ? 'Connect with the tools you already use' : 'আপনার পরিচিত টুলসের সাথে সংযুক্ত করুন'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {integrations.map((intg, idx) => (
              <div key={idx} className={`${intg.color} border rounded-2xl p-4 text-center transition-all hover:-translate-y-1 hover:shadow-md`}>
                <div className="text-3xl mb-2">{intg.icon}</div>
                <div className="text-sm font-bold">{intg.name}</div>
                <div className="text-xs text-zinc-500 mt-1">{language === 'en' ? intg.desc.en : intg.desc.bn}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="relative p-10 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-surface-hover overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {language === 'en' ? 'Ready to transform your business?' : 'আপনার ব্যবসা রূপান্তর করতে প্রস্তুত?'}
            </h2>
            <p className="text-zinc-500 mb-8 max-w-xl mx-auto">
              {language === 'en'
                ? 'Start your free trial today. No credit card required. Setup in minutes.'
                : 'আজই বিনামূল্যে শুরু করুন। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই। মিনিটের মধ্যে সেটআপ।'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/signup"
                className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-sm font-bold text-white hover:opacity-90 transition-all hover:scale-105 shadow-glow"
              >
                {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
              </Link>
              <Link
                href="/contact"
                className="rounded-full bg-surface border border-surface-hover px-8 py-4 text-sm font-semibold hover:bg-surface-hover transition-all"
              >
                {language === 'en' ? 'Talk to Sales' : 'সেলসের সাথে কথা বলুন'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


