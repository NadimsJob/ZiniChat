'use client';

import { useLanguage } from '@/components/LanguageProvider';

// ─── Metric bar at the top (like Flowza's .metrics) ─────────────────────────
const topMetrics = [
  {
    value: { en: '98%', bn: '৯৮%' },
    label: { en: 'WhatsApp Open Rate vs 22% Email', bn: 'WA ওপেন রেট — ইমেইলের ২২% এর তুলনায়' },
  },
  {
    value: { en: '1.2s', bn: '১.২ সে.' },
    label: { en: 'Average AI response time — 24 / 7', bn: 'গড় AI রেসপন্স সময় — ২৪/৭' },
  },
  {
    value: { en: '5×', bn: '৫×' },
    label: { en: 'Customer coverage per support staff', bn: 'প্রতি সাপোর্ট কর্মীর কাস্টমার ধারণক্ষমতা' },
  },
];

// ─── Featured (delivered) scenario ───────────────────────────────────────────
const featured = {
  tag: { en: 'Modeled Result', bn: 'মডেলকৃত ফলাফল' },
  title: {
    en: 'Fashion F-Commerce Brand — 3,000+ WhatsApp customers/month',
    bn: 'ফ্যাশন F-কমার্স ব্র্যান্ড — ৩,০০০+ WhatsApp কাস্টমার/মাস',
  },
  body: {
    en: 'Customers used to wait hours for replies about product prices, sizes, and availability. Agents manually responded to hundreds of Facebook comments and sent bKash payment confirmations one by one. With ZiniChat, AI handles all initial inquiries, Comment Automation converts every boosted-post comment to a private DM with product details, and bKash SMS auto-verifies payments instantly — freeing the team to focus on sourcing.',
    bn: 'আগে পণ্যের দাম, সাইজ ও স্টকের জিজ্ঞাসায় কয়েক ঘণ্টা অপেক্ষা করতে হতো। এজেন্টরা শত শত ফেসবুক কমেন্টে ম্যানুয়ালি রিপ্লাই দিত এবং একে একে বিকাশ পেমেন্ট কনফার্ম করত। ZiniChat চালু করার পর AI সব প্রাথমিক জিজ্ঞাসা হ্যান্ডেল করে, কমেন্ট অটোমেশন প্রতিটি কমেন্টকে প্রাইভেট DM-এ রূপান্তর করে এবং বিকাশ SMS অটো-ভেরিফাই হয় — টিম এখন সোর্সিং ও নতুন পণ্যে মনোযোগ দিতে পারছে।',
  },
  statValue: { en: '3 → 1', bn: '৩ → ১' },
  statLabel: {
    en: 'Support staff needed — while handling 3× more customers',
    bn: 'সাপোর্ট কর্মী প্রয়োজন — ৩ গুণ বেশি কাস্টমার সামলাতে',
  },
};

// ─── Modeled scenario cards (6 industries) ───────────────────────────────────
const scenarios = [
  {
    tag: { en: 'F-Commerce / Fashion', bn: 'ফ্যাশন / পোশাক' },
    title: {
      en: 'Clothing Store — ৳15L/yr revenue, 5 staff',
      bn: 'কাপড়ের ব্যবসা — বার্ষিক ৳১৫ লাখ রেভিনিউ, ৫ কর্মী',
    },
    problem: {
      en: 'Sends ~200 broadcast messages a week manually via personal WhatsApp. 60% of Facebook post comments get no reply. bKash confirmations take 15–30 min to process manually.',
      bn: 'প্রতি সপ্তাহে ব্যক্তিগত WhatsApp থেকে ~২০০টি মেসেজ ম্যানুয়ালি পাঠানো হয়। ফেসবুক পোস্টের ৬০% কমেন্টে কোনো রিপ্লাই হয় না। বিকাশ কনফার্মেশনে ১৫-৩০ মিনিট লাগে।',
    },
    fix: {
      en: 'Broadcast campaigns to 5,000 contacts in 5 minutes. AI auto-replies all Facebook comments + sends product DMs. bKash SMS auto-verified instantly.',
      bn: 'ব্রডকাস্ট ক্যাম্পেইন ৫,০০০ কন্ট্যাক্টে ৫ মিনিটে। AI সব কমেন্টে অটো-রিপ্লাই দেয় + পণ্যের DM পাঠায়। বিকাশ SMS তাৎক্ষণিক অটো-ভেরিফাই।',
    },
    result: { en: '+৳1,80,000/yr', bn: '+৳১,৮০,০০০/বছর' },
    resultLabel: {
      en: 'Revenue from 20% conversion lift on broadcast + saved 2 FTE staff hours daily',
      bn: 'ব্রডকাস্টে ২০% কনভার্সন বৃদ্ধি + দৈনিক ২ কর্মীর সময় সাশ্রয়',
    },
  },
  {
    tag: { en: 'Restaurant / Food Delivery', bn: 'রেস্টুরেন্ট / ফুড ডেলিভারি' },
    title: {
      en: 'Restaurant — 80 orders/day, 10 staff',
      bn: 'রেস্টুরেন্ট — দৈনিক ৮০ অর্ডার, ১০ কর্মী',
    },
    problem: {
      en: 'Orders come in via phone call, WhatsApp, and Facebook — all tracked in a notebook. Delivery status requires staff to call each rider manually. Peak-hour chaos causes 15% order errors.',
      bn: 'অর্ডার আসে ফোন, WhatsApp ও Facebook থেকে — সব নোটবুকে লেখা। ডেলিভারি স্ট্যাটাস জানতে রাইডারকে ফোন করতে হয়। পিক আওয়ারে ১৫% অর্ডারে ভুল হয়।',
    },
    fix: {
      en: 'AI chatbot takes orders directly in WhatsApp. Unified inbox merges all channels. Kanban board tracks every order from kitchen to delivery in real-time.',
      bn: 'AI চ্যাটবট সরাসরি WhatsApp এ অর্ডার নেয়। ইউনিফাইড ইনবক্স সব চ্যানেল একত্রিত করে। Kanban বোর্ড রান্নাঘর থেকে ডেলিভারি পর্যন্ত প্রতিটি অর্ডার ট্র্যাক করে।',
    },
    result: { en: '+৳90,000/yr', bn: '+৳৯০,০০০/বছর' },
    resultLabel: {
      en: 'Saved from order errors + 1 FTE staff saved + 18% faster delivery cycle',
      bn: 'অর্ডার ভুল কমিয়ে সাশ্রয় + ১ কর্মীর সমমানের কাজ + ১৮% দ্রুত ডেলিভারি',
    },
  },
  {
    tag: { en: 'Real Estate / Property', bn: 'রিয়েল এস্টেট / প্রপার্টি' },
    title: {
      en: 'Property Agency — 30 listings, 8 agents',
      bn: 'প্রপার্টি এজেন্সি — ৩০টি লিস্টিং, ৮ জন এজেন্ট',
    },
    problem: {
      en: 'Weekend inquiries from Facebook ads go unanswered until Monday. No system to track which agent followed up which lead. 40% of hot leads go cold within 48 hours.',
      bn: 'Facebook বিজ্ঞাপন থেকে সাপ্তাহান্তের জিজ্ঞাসা সোমবার পর্যন্ত অপেক্ষা করে। কোন এজেন্ট কোন লিড ফলো-আপ করেছে তা ট্র্যাকের কোনো সিস্টেম নেই। ৪০% হট লিড ৪৮ ঘণ্টায় ঠান্ডা হয়ে যায়।',
    },
    fix: {
      en: 'AI instantly qualifies every lead 24/7, assigns to the right agent via CRM Kanban, and sends automated follow-up sequences at day 1, 3, and 7.',
      bn: 'AI ২৪/৭ প্রতিটি লিড তাৎক্ষণিক যাচাই করে, CRM Kanban-এ সঠিক এজেন্টের কাছে পাঠায় এবং ১ম, ৩য় ও ৭ম দিনে অটোমেটেড ফলো-আপ পাঠায়।',
    },
    result: { en: '+৳3,00,000/yr', bn: '+৳৩,০০,০০০/বছর' },
    resultLabel: {
      en: 'From closing 2 extra properties/yr with a 30% lead conversion rate lift',
      bn: 'বছরে ২টি অতিরিক্ত প্রপার্টি বিক্রি থেকে — লিড কনভার্সন রেট ৩০% বৃদ্ধি',
    },
  },
  {
    tag: { en: 'Service Business (Clinic / Salon)', bn: 'সার্ভিস (ক্লিনিক / সেলুন / টিউশন)' },
    title: {
      en: 'Diagnostic Clinic — 50 appointments/day',
      bn: 'ডায়াগনস্টিক ক্লিনিক — দৈনিক ৫০টি অ্যাপয়েন্টমেন্ট',
    },
    problem: {
      en: 'Receptionist spends 4 hours/day manually confirming appointments via WhatsApp and phone. 20% of patients don\'t show without reminder. Report collection takes 2–3 days of WhatsApp chasing.',
      bn: 'রিসেপশনিস্ট প্রতিদিন ৪ ঘণ্টা WhatsApp ও ফোনে অ্যাপয়েন্টমেন্ট কনফার্ম করেন। ২০% রোগী রিমাইন্ডার ছাড়া আসে না। রিপোর্ট সংগ্রহে ২-৩ দিনের WhatsApp পিছু লাগে।',
    },
    fix: {
      en: 'AI handles appointment booking via WhatsApp. Automated reminder at 24h and 2h before slot. Test result ready notifications sent automatically.',
      bn: 'AI WhatsApp-এ অ্যাপয়েন্টমেন্ট বুকিং হ্যান্ডেল করে। স্লটের ২৪ ঘণ্টা ও ২ ঘণ্টা আগে অটো-রিমাইন্ডার। রিপোর্ট রেডি নোটিফিকেশন স্বয়ংক্রিয়ভাবে পাঠানো হয়।',
    },
    result: { en: '+৳1,20,000/yr', bn: '+৳১,২০,০০০/বছর' },
    resultLabel: {
      en: 'Saved from 1 receptionist FTE + 20% no-show reduction = 10 extra patients/week',
      bn: '১ রিসেপশনিস্টের সমপরিমাণ সময় বাঁচানো + ২০% নো-শো কমিয়ে সাপ্তাহে ১০ রোগী বেশি',
    },
  },
  {
    tag: { en: 'Wholesale / Distribution', bn: 'পাইকারি / হোলসেইল' },
    title: {
      en: 'Wholesale Distributor — 200 retail clients',
      bn: 'পাইকারি পরিবেশক — ২০০ রিটেইলার ক্লায়েন্ট',
    },
    problem: {
      en: 'Sales reps collect orders via personal WhatsApp numbers — no central record. Invoices prepared manually in Excel — takes 2 hours per day. Payment follow-up is entirely manual via phone calls.',
      bn: 'সেলস রেপরা ব্যক্তিগত WhatsApp নম্বরে অর্ডার নেয় — কোনো কেন্দ্রীয় রেকর্ড নেই। ইনভয়েস Excel-এ ম্যানুয়ালি তৈরি হয় — প্রতিদিন ২ ঘণ্টা লাগে। পেমেন্ট ফলো-আপ ফোনে ম্যানুয়ালি করতে হয়।',
    },
    fix: {
      en: 'All retailer orders go into one ZiniChat inbox. AI logs orders to CRM automatically. bKash/Nagad payment SMS auto-verified. Automated weekly payment reminders via WhatsApp Broadcast.',
      bn: 'সব রিটেইলারের অর্ডার এক ZiniChat ইনবক্সে আসে। AI অর্ডার CRM-এ অটো লগ করে। বিকাশ/নগদ পেমেন্ট SMS অটো-ভেরিফাই। WhatsApp Broadcast-এ সাপ্তাহিক পেমেন্ট রিমাইন্ডার।',
    },
    result: { en: '+৳2,40,000/yr', bn: '+৳২,৪০,০০০/বছর' },
    resultLabel: {
      en: '2 FTE hours/day saved + 30% faster collections + 15% fewer order errors',
      bn: 'দৈনিক ২ FTE ঘণ্টা সাশ্রয় + ৩০% দ্রুত পেমেন্ট আদায় + ১৫% কম অর্ডার ভুল',
    },
  },
  {
    tag: { en: 'Freight / Logistics', bn: 'ফ্রেইট / লজিস্টিকস' },
    title: {
      en: 'Freight Forwarder — 300 shipments/month',
      bn: 'ফ্রেইট ফরওয়ার্ডার — মাসে ৩০০টি শিপমেন্ট',
    },
    problem: {
      en: 'Operations team spends 3 hours/day answering "Where is my shipment?" calls. Documents (LC copies, B/L, invoices) arrive across WhatsApp, email, and Messenger — easy to lose. Quote responses take 1 day.',
      bn: 'অপারেশন টিম প্রতিদিন ৩ ঘণ্টা "আমার শিপমেন্ট কোথায়?" কলে ব্যয় করে। ডকুমেন্ট (LC কপি, B/L, ইনভয়েস) WhatsApp, ইমেইল ও Messenger-এ আসে — হারিয়ে যাওয়া সহজ। কোটেশন রেসপন্সে ১ দিন লাগে।',
    },
    fix: {
      en: 'AI auto-replies shipment status from CRM data. All channel documents stored in one Contact record. Automated quote templates sent in minutes via WhatsApp.',
      bn: 'AI CRM ডেটা থেকে শিপমেন্ট স্ট্যাটাস অটো-রিপ্লাই করে। সব চ্যানেলের ডকুমেন্ট এক Contact রেকর্ডে সংরক্ষিত। WhatsApp-এ মিনিটের মধ্যে অটোমেটেড কোটেশন টেমপ্লেট পাঠানো হয়।',
    },
    result: { en: '+৳2,10,000/yr', bn: '+৳২,১০,০০০/বছর' },
    resultLabel: {
      en: '1 FTE saved on status calls + 40% faster quote turnaround = 25 extra shipments/month',
      bn: 'স্ট্যাটাস কলে ১ FTE বাঁচানো + ৪০% দ্রুত কোটেশন = মাসে ২৫টি অতিরিক্ত শিপমেন্ট',
    },
  },
];

export default function ResultsSection() {
  const { language } = useLanguage();
  const t = (obj: { en: string; bn: string }) => (language === 'en' ? obj.en : obj.bn);

  return (
    <section id="results" className="relative w-full bg-background py-20 lg:py-28 border-y border-border/40 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-0 w-[36rem] h-[36rem] -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute right-1/4 bottom-0 w-[28rem] h-[28rem] translate-y-1/2 rounded-full bg-secondary/8 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Section header ─────────────────────────────────────────── */}
        <div className="mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {language === 'en' ? 'Results & Impact' : 'ফলাফল ও প্রভাব'}
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
            {language === 'en'
              ? 'What switching to ZiniChat actually looks like.'
              : 'ZiniChat-এ যাওয়ার পরে কী পরিবর্তন হয়।'}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {language === 'en'
              ? 'One featured scenario and six industry models — built on realistic numbers from businesses like yours.'
              : 'একটি ফিচার্ড সিনারিও এবং ছয়টি ইন্ডাস্ট্রি মডেল — আপনার মতো ব্যবসার বাস্তবসম্মত সংখ্যার উপর ভিত্তি করে তৈরি।'}
          </p>
        </div>

        {/* ── Top 3 metrics (like Flowza) ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40 border border-border/40 rounded-2xl mb-10 bg-card/50 backdrop-blur-sm overflow-hidden">
          {topMetrics.map((m, i) => (
            <div key={i} className="px-8 py-8">
              <div className="text-4xl md:text-5xl font-black tracking-tight text-primary leading-none mb-3">
                {t(m.value)}
              </div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground leading-snug">
                {t(m.label)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Featured scenario (wide card like Flowza's res-featured) ── */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center border border-primary/30 rounded-2xl p-8 md:p-10 bg-gradient-to-br from-primary/8 via-card to-secondary/5 shadow-[0_30px_70px_-38px_rgba(var(--primary-rgb,31,130,74),.35)] mb-8">
          <div>
            {/* Tag */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-3 py-1 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {t(featured.tag)}
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 leading-tight">
              {t(featured.title)}
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base max-w-2xl">
              {t(featured.body)}
            </p>
          </div>
          {/* Big stat */}
          <div className="text-center lg:text-right shrink-0">
            <div className="text-5xl md:text-6xl font-black tracking-tighter text-primary leading-none whitespace-nowrap">
              {t(featured.statValue)}
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-3 max-w-[18ch] mx-auto lg:ml-auto lg:mr-0">
              {t(featured.statLabel)}
            </div>
          </div>
        </div>

        {/* ── 6 industry scenario cards ───────────────────────────────── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {scenarios.map((s, i) => (
            <div
              key={i}
              className="flex flex-col bg-card border border-border/60 rounded-2xl p-6 transition-all duration-300 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl group"
            >
              {/* Tag */}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1 w-fit mb-4">
                {t(s.tag)}
              </span>

              {/* Title */}
              <h3 className="text-base font-bold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors">
                {t(s.title)}
              </h3>

              {/* Problem */}
              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                {t(s.problem)}
              </p>

              {/* Fix */}
              <p className="text-sm text-foreground/80 leading-relaxed mb-5">
                <span className="font-bold text-foreground">
                  {language === 'en' ? 'The fix: ' : 'সমাধান: '}
                </span>
                {t(s.fix)}
              </p>

              {/* Result number — always at bottom */}
              <div className="mt-auto border-t border-border/60 pt-4">
                <div className="text-2xl font-black text-primary leading-tight tracking-tight">
                  {t(s.result)}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 leading-snug">
                  {t(s.resultLabel)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Disclaimer note (like Flowza's .res-note) ───────────────── */}
        <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-3xl font-mono">
          {language === 'en'
            ? 'Modeled scenarios are representative examples built from industry benchmarks and ZiniChat platform capabilities — not specific client testimonials. Your actual results will depend on business size, usage, and market context. Start a free trial to measure your own baseline.'
            : 'মডেলকৃত সিনারিওগুলো ইন্ডাস্ট্রি বেঞ্চমার্ক ও ZiniChat প্ল্যাটফর্মের সক্ষমতার ভিত্তিতে তৈরি উদাহরণ — নির্দিষ্ট ক্লায়েন্টের টেস্টিমোনিয়াল নয়। আপনার প্রকৃত ফলাফল ব্যবসার আকার, ব্যবহার ও বাজার প্রেক্ষাপটের উপর নির্ভর করবে। আপনার নিজের বেসলাইন পরিমাপ করতে ফ্রি ট্রায়াল শুরু করুন।'}
        </p>
      </div>
    </section>
  );
}
