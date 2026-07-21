'use client';

import { useLanguage } from '@/components/LanguageProvider';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
    color: 'from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-500 bg-green-500/10',
  },
  {
    icon: '🌐',
    titleEn: 'Omnichannel by Design',
    titleBn: 'অমনিচ্যানেল ডিজাইন',
    descEn: 'WhatsApp, Messenger, Instagram — your customers are everywhere. We bring all channels into one powerful inbox so your team never misses a message.',
    descBn: 'WhatsApp, Messenger, Instagram — আপনার গ্রাহকরা সর্বত্র। আমরা সব চ্যানেল একটি ইনবক্সে নিয়ে আসি যাতে আপনার টিম কোনো মেসেজ মিস না করে।',
    color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-500 bg-blue-500/10',
  },
  {
    icon: '🌍',
    titleEn: 'Built for Global Scaling',
    titleBn: 'গ্লোবাল স্কেলিংয়ের জন্য তৈরি',
    descEn: 'From bilingual support to robust infrastructure, we are designed specifically to help modern businesses grow worldwide.',
    descBn: 'দ্বিভাষিক সমর্থন থেকে শুরু করে শক্তিশালী পরিকাঠামো পর্যন্ত, আমরা আধুনিক ব্যবসাকে বিশ্বব্যাপী বাড়াতে সাহায্য করার জন্য বিশেষভাবে ডিজাইন করা হয়েছি।',
    color: 'from-orange-500/10 to-amber-500/10 border-orange-500/20 text-orange-500 bg-orange-500/10',
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
  { name: 'NestJS', color: 'bg-red-500/10 border-red-500/20 text-red-600' },
  { name: 'Next.js', color: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600' },
  { name: 'PostgreSQL', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600' },
  { name: 'OpenAI GPT', color: 'bg-teal-500/10 border-teal-500/20 text-teal-600' },
  { name: 'WhatsApp API', color: 'bg-green-500/10 border-green-500/20 text-green-600' },
  { name: 'Socket.io', color: 'bg-purple-500/10 border-purple-500/20 text-purple-600' },
  { name: 'BullMQ', color: 'bg-orange-500/10 border-orange-500/20 text-orange-600' },
  { name: 'Docker', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600' },
];

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center w-full overflow-hidden bg-background">

      {/* Hero */}
      <section className="relative w-full bg-muted pb-16 pt-12 lg:pb-24 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/3 top-10 w-[40rem] h-[40rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"></div>
          <div className="absolute right-1/3 bottom-0 w-[30rem] h-[30rem] translate-y-1/2 rounded-full bg-secondary/10 blur-[100px]"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary sm:text-sm mb-6">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="inline-flex w-2 h-2 rounded-full bg-primary"></span>
            </span>
            {language === 'en' ? 'Our Story' : 'আমাদের গল্প'}
          </div>
          
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            {language === 'en' ? (
              <>Built for <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Modern Businesses</span>, <br />Ready for the World</>
            ) : (
              <><span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">আধুনিক ব্যবসার</span> জন্য তৈরি,<br />বিশ্বের জন্য প্রস্তুত</>
            )}
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {language === 'en'
              ? 'ZiniChat was born from a simple observation: Every business deserves world-class AI tools that speak their language, understand their market, and cost what they can afford.'
              : 'ZiniChat একটি সহজ পর্যবেক্ষণ থেকে জন্ম নিয়েছে: প্রতিটি ব্যবসা বিশ্বমানের AI টুলের দাবিদার, যা তাদের ভাষা ও বাজার বোঝে।'}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="relative w-full border-y border-border/40 bg-card z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border/50">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center justify-center">
              <div className={`text-4xl md:text-5xl font-black mb-2 tracking-tighter ${s.color}`}>{language === 'en' ? s.en : s.bn}</div>
              <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                {language === 'en' ? s.labelEn : s.labelBn}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="relative w-full bg-background py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="order-2 lg:order-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                {language === 'en' ? 'Our Mission' : 'আমাদের লক্ষ্য'}
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-8 text-foreground">
                {language === 'en' ? 'Empowering businesses with intelligent automation' : 'বুদ্ধিমান অটোমেশনের মাধ্যমে ব্যবসাকে শক্তিশালী করা'}
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  {language === 'en'
                    ? 'We are building the next generation omnichannel AI assistant platform for businesses worldwide. Our mission is to democratize AI automation — making it accessible, affordable, and effective for every business, regardless of size.'
                    : 'আমরা বিশ্বব্যাপী ব্যবসার জন্য পরবর্তী প্রজন্মের অমনিচ্যানেল AI অ্যাসিস্ট্যান্ট প্ল্যাটফর্ম তৈরি করছি। আমাদের লক্ষ্য হলো AI অটোমেশনকে সবার জন্য সহজলভ্য ও কার্যকরী করে তোলা।'}
                </p>
                <p>
                  {language === 'en'
                    ? 'With seamless integrations for WhatsApp, Meta Messenger, and Instagram, we help you connect with your customers where they already are — automatically handling inquiries 24/7 while your team focuses on what matters most.'
                    : 'WhatsApp, Meta Messenger এবং Instagram-এর সাথে নিরবচ্ছিন্ন ইন্টিগ্রেশনের মাধ্যমে, আমরা আপনাকে আপনার গ্রাহকদের সাথে সংযুক্ত করতে সাহায্য করি।'}
                </p>
              </div>
            </div>
            
            <div className="order-1 lg:order-2 grid grid-cols-1 gap-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl blur-2xl -z-10"></div>
              {pillars.map((p, i) => (
                <div key={i} className={`p-6 md:p-8 rounded-3xl bg-card border border-border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30 group`}>
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className={`text-4xl p-4 rounded-2xl ${p.color} shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                      {p.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-foreground group-hover:text-primary transition-colors">{language === 'en' ? p.titleEn : p.titleBn}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{language === 'en' ? p.descEn : p.descBn}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative w-full bg-muted border-y border-border/40 py-20 lg:py-28">
        <div className="pointer-events-none absolute -right-24 top-1/4 w-72 h-72 rounded-full bg-secondary/10 blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              {language === 'en' ? 'Core Values' : 'মূল মূল্যবোধ'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-foreground">
              {language === 'en' ? 'The principles that guide us' : 'যে নীতিগুলো আমাদের পরিচালিত করে'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {language === 'en' ? 'Every decision we make, every line of code we write is built on these foundational values.' : 'আমাদের প্রতিটি সিদ্ধান্ত, আমাদের লেখা প্রতিটি কোড এই মৌলিক মূল্যবোধগুলোর ওপর ভিত্তি করে তৈরি।'}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((v, i) => (
              <div key={i} className="bg-card border border-border rounded-3xl p-8 lg:p-10 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl group">
                <div className="text-5xl mb-6 inline-block transform group-hover:scale-110 transition-transform duration-300 bg-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto">{v.icon}</div>
                <h3 className="text-2xl font-bold mb-4 text-foreground">{language === 'en' ? v.titleEn : v.titleBn}</h3>
                <p className="text-muted-foreground text-base leading-relaxed">{language === 'en' ? v.descEn : v.descBn}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-4 text-foreground">
          {language === 'en' ? 'Built on World-Class Tech' : 'বিশ্বমানের প্রযুক্তিতে তৈরি'}
        </h2>
        <p className="text-muted-foreground mb-12 text-lg max-w-2xl mx-auto">
          {language === 'en' ? 'Enterprise-grade infrastructure powering every conversation, designed for scale and reliability.' : 'প্রতিটি কথোপকথন পরিচালনাকারী এন্টারপ্রাইজ-গ্রেড অবকাঠামো, যা স্কেল এবং নির্ভরযোগ্যতার জন্য ডিজাইন করা হয়েছে।'}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {techStack.map((t, i) => (
            <span key={i} className={`px-5 py-2.5 rounded-full border bg-card text-sm font-bold shadow-sm hover:shadow-md transition-shadow ${t.color}`}>
              {t.name}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full overflow-hidden bg-primary py-20 px-4 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-10 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 text-primary-foreground">
            {language === 'en' ? 'Join 500+ businesses today' : 'আজই ৫০০+ ব্যবসার সাথে যোগ দিন'}
          </h2>
          <p className="text-base text-primary-foreground/80 mb-10 max-w-xl mx-auto sm:text-lg">
            {language === 'en'
              ? 'Start your free trial. No credit card required. See results in the first week.'
              : 'আপনার বিনামূল্যে ট্রায়াল শুরু করুন। প্রথম সপ্তাহেই ফলাফল দেখুন।'}
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
              {language === 'en' ? 'Contact Us' : 'যোগাযোগ করুন'}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
