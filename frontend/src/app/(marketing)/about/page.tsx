'use client';

import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';

const stats = [
  { en: '500+', bn: '৫০০+', labelEn: 'Active Businesses', labelBn: 'অ্যাক্টিভ ব্যবসা', color: 'text-primary' },
  { en: '10M+', bn: '১ কোটি+', labelEn: 'Messages Sent', labelBn: 'মেসেজ পাঠানো', color: 'text-secondary' },
  { en: '99.9%', bn: '৯৯.৯%', labelEn: 'Uptime SLA', labelBn: 'আপটাইম SLA', color: 'text-blue-500' },
  { en: '24/7', bn: '২৪/৭', labelEn: 'AI Availability', labelBn: 'AI উপলব্ধতা', color: 'text-teal-500' },
];

const pillars = [
  {
    icon: '🤖',
    titleEn: 'AI-First Automation',
    titleBn: 'AI-প্রথম অটোমেশন',
    descEn: 'We believe AI should do the heavy lifting. Our platform lets businesses train custom AI models on their own data — no coding required.',
    descBn: 'আমরা বিশ্বাস করি AI কঠিন কাজগুলো করুক। আমাদের প্ল্যাটফর্ম ব্যবসাগুলোকে তাদের নিজস্ব ডেটায় কাস্টম AI মডেল ট্রেইন করতে দেয়।',
    color: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
  },
  {
    icon: '🌐',
    titleEn: 'Omnichannel by Design',
    titleBn: 'অমনিচ্যানেল ডিজাইন',
    descEn: 'WhatsApp, Messenger, Instagram — your customers are everywhere. We bring all channels into one powerful inbox so your team never misses a message.',
    descBn: 'WhatsApp, Messenger, Instagram — আপনার গ্রাহকরা সর্বত্র। আমরা সব চ্যানেল একটি ইনবক্সে নিয়ে আসি যাতে আপনার টিম কোনো মেসেজ মিস না করে।',
    color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
  },
  {
    icon: '🌍',
    titleEn: 'Built for Global Scaling',
    titleBn: 'গ্লোবাল স্কেলিংয়ের জন্য তৈরি',
    descEn: 'From bilingual support to robust infrastructure, we are designed specifically to help modern businesses grow worldwide.',
    descBn: 'দ্বিভাষিক সমর্থন থেকে শুরু করে শক্তিশালী পরিকাঠামো পর্যন্ত, আমরা আধুনিক ব্যবসাকে বিশ্বব্যাপী বাড়াতে সাহায্য করার জন্য বিশেষভাবে ডিজাইন করা হয়েছি।',
    color: 'from-orange-500/10 to-amber-500/10 border-orange-500/20',
  },
];

const values = [
  {
    icon: '💡',
    titleEn: 'Innovation',
    titleBn: 'উদ্ভাবন',
    descEn: 'We constantly push boundaries to bring you cutting-edge AI and messaging technology.',
    descBn: 'আমরা ক্রমাগত সীমানা অতিক্রম করে আপনার কাছে অত্যাধুনিক AI এবং মেসেজিং প্রযুক্তি নিয়ে আসি।',
  },
  {
    icon: '🛡️',
    titleEn: 'Reliability',
    titleBn: 'নির্ভরযোগ্যতা',
    descEn: '99.9% uptime SLA backed by reliable, enterprise-grade cloud infrastructure.',
    descBn: 'নির্ভরযোগ্য এন্টারপ্রাইজ-গ্রেড ক্লাউড অবকাঠামো দ্বারা সমর্থিত ৯৯.৯% আপটাইম SLA।',
  },
  {
    icon: '❤️',
    titleEn: 'Customer First',
    titleBn: 'গ্রাহক প্রথম',
    descEn: 'Every feature we build starts with a customer problem. Your success is our only metric.',
    descBn: 'আমরা যে প্রতিটি ফিচার তৈরি করি তা একটি গ্রাহকের সমস্যা দিয়ে শুরু হয়। আপনার সাফল্যই আমাদের একমাত্র মেট্রিক।',
  },
];

const techStack = [
  { name: 'NestJS', color: 'bg-red-500/10 border-red-500/20 text-red-500' },
  { name: 'Next.js', color: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' },
  { name: 'PostgreSQL', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { name: 'OpenAI GPT', color: 'bg-teal-500/10 border-teal-500/20 text-teal-400' },
  { name: 'WhatsApp API', color: 'bg-green-500/10 border-green-500/20 text-green-500' },
  { name: 'Socket.io', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  { name: 'BullMQ', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
  { name: 'Docker', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
];

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center overflow-hidden">

      {/* Hero */}
      <section className="w-full relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
        <div className="absolute top-10 left-1/3 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {language === 'en' ? 'Our Story' : 'আমাদের গল্প'}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            {language === 'en' ? (
              <>Built for <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Modern Businesses</span>, <br />Ready for the World</>
            ) : (
              <><span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">আধুনিক ব্যবসার</span> জন্য তৈরি,<br />বিশ্বের জন্য প্রস্তুত</>
            )}
          </h1>
          <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
            {language === 'en'
              ? 'ZiniChat was born from a simple observation: Every business deserves world-class AI tools that speak their language, understand their market, and cost what they can afford.'
              : 'ZiniChat একটি সহজ পর্যবেক্ষণ থেকে জন্ম নিয়েছে: প্রতিটি ব্যবসা বিশ্বমানের AI টুলের দাবিদার, যা তাদের ভাষা ও বাজার বোঝে।'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="w-full border-y border-surface-hover bg-surface/30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-surface-hover/50">
          {stats.map((s, i) => (
            <div key={i}>
              <div className={`text-4xl font-extrabold mb-1 ${s.color}`}>{language === 'en' ? s.en : s.bn}</div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {language === 'en' ? s.labelEn : s.labelBn}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
              {language === 'en' ? 'Our Mission' : 'আমাদের লক্ষ্য'}
            </h2>
            <p className="text-zinc-500 leading-relaxed text-base mb-6">
              {language === 'en'
                ? 'We are building the next generation omnichannel AI assistant platform for businesses worldwide. Our mission is to democratize AI automation — making it accessible, affordable, and effective for every business, regardless of size.'
                : 'আমরা বিশ্বব্যাপী ব্যবসার জন্য পরবর্তী প্রজন্মের অমনিচ্যানেল AI অ্যাসিস্ট্যান্ট প্ল্যাটফর্ম তৈরি করছি। আমাদের লক্ষ্য হলো AI অটোমেশনকে সবার জন্য সহজলভ্য ও কার্যকরী করে তোলা।'}
            </p>
            <p className="text-zinc-500 leading-relaxed text-base">
              {language === 'en'
                ? 'With seamless integrations for WhatsApp, Meta Messenger, and Instagram, we help you connect with your customers where they already are — automatically handling inquiries 24/7 while your team focuses on what matters most.'
                : 'WhatsApp, Meta Messenger এবং Instagram-এর সাথে নিরবচ্ছিন্ন ইন্টিগ্রেশনের মাধ্যমে, আমরা আপনাকে আপনার গ্রাহকদের সাথে সংযুক্ত করতে সাহায্য করি।'}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {pillars.map((p, i) => (
              <div key={i} className={`p-5 rounded-2xl bg-gradient-to-br ${p.color} border transition-all hover:-translate-y-1 hover:shadow-lg`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{p.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{language === 'en' ? p.titleEn : p.titleBn}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{language === 'en' ? p.descEn : p.descBn}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="w-full bg-surface-hover/30 border-y border-surface-hover py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {language === 'en' ? 'Our Core Values' : 'আমাদের মূল মূল্যবোধ'}
            </h2>
            <p className="text-zinc-500">
              {language === 'en' ? 'The principles that guide every decision we make' : 'যে নীতিগুলো আমাদের প্রতিটি সিদ্ধান্তকে পরিচালিত করে'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-background border border-surface-hover rounded-2xl p-8 text-center hover:border-primary/30 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="text-5xl mb-4">{v.icon}</div>
                <h3 className="text-xl font-bold mb-3">{language === 'en' ? v.titleEn : v.titleBn}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{language === 'en' ? v.descEn : v.descBn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-3">
          {language === 'en' ? 'Built on World-Class Tech' : 'বিশ্বমানের প্রযুক্তিতে তৈরি'}
        </h2>
        <p className="text-zinc-500 mb-10 text-sm">
          {language === 'en' ? 'Enterprise-grade infrastructure powering every conversation' : 'প্রতিটি কথোপকথন পরিচালনাকারী এন্টারপ্রাইজ-গ্রেড অবকাঠামো'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((t, i) => (
            <span key={i} className={`px-4 py-2 rounded-full border text-sm font-semibold ${t.color}`}>
              {t.name}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full max-w-4xl mx-auto px-4 pb-24 text-center">
        <div className="relative p-10 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-surface-hover overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              {language === 'en' ? 'Join 500+ businesses today' : 'আজই ৫০০+ ব্যবসার সাথে যোগ দিন'}
            </h2>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto">
              {language === 'en'
                ? 'Start your free trial. No credit card required. See results in the first week.'
                : 'আপনার বিনামূল্যে ট্রায়াল শুরু করুন। প্রথম সপ্তাহেই ফলাফল দেখুন।'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/signup" className="rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-sm font-bold text-white hover:opacity-90 transition-all hover:scale-105 shadow-glow">
                {language === 'en' ? 'Start Free Trial' : 'ফ্রি ট্রায়াল শুরু করুন'}
              </Link>
              <Link href="/contact" className="rounded-full bg-surface border border-surface-hover px-8 py-4 text-sm font-semibold hover:bg-surface-hover transition-all">
                {language === 'en' ? 'Contact Us' : 'যোগাযোগ করুন'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
