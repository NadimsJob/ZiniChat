/**
 * Client-Side In-Memory Cache & In-Flight Deduplication for Public Marketing Data
 * Eliminates duplicate network waterfalls between MarketingLayout, HomePageContent, and PricingSection.
 */

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Default static fallback config matching official ZiniChat branding
// Allows instant 0ms first paint without waiting for network or showing a blank spinner
export const DEFAULT_FALLBACK_CONFIG = {
  heroTitle: 'Supercharge Your Business with AI',
  heroTitleBn: 'এআই দিয়ে আপনার ব্যবসাকে শক্তিশালী করুন',
  heroSubtitle: 'The ultimate omnichannel platform for WhatsApp, Messenger, and Instagram.',
  heroSubtitleBn: 'হোয়াটসঅ্যাপ, মেসেঞ্জার এবং ইনস্টাগ্রামের জন্য সেরা অমনিচ্যানেল প্ল্যাটফর্ম।',
  featuresJson: [
    {
      id: 'inbox',
      iconName: 'MessageSquare',
      colorTheme: 'blue',
      title: { en: 'Omnichannel Unified Inbox', bn: 'এক জায়গায় সব কথোপকথন (Omnichannel Inbox)' },
      description: {
        en: 'Manage all customer messages from WhatsApp Official API, WhatsApp Web (QR), Facebook Messenger, and Instagram DM in one unified dashboard.',
        bn: 'WhatsApp Official API, WhatsApp Web (QR), Facebook Messenger এবং Instagram DM-এর সব কাস্টমার মেসেজ একটি ইনবক্সেই পরিচালনা করুন।'
      },
      bullets: {
        en: ['4 apps into 1 single unified inbox', 'Zero missed messages & 80% faster response time', 'Real-time WebSocket instant updates'],
        bn: ['৪টি আলাদা অ্যাপ বাদ দিয়ে ১টি ZiniChat ব্যবহার', 'কোনো মেসেজ মিস হয় না, ৮০% পর্যন্ত দ্রুত রেসপন্স', 'রিয়েল-টাইম সকেট মেসেজ সিঙ্ক']
      }
    },
    {
      id: 'ai',
      iconName: 'Bot',
      colorTheme: 'green',
      title: { en: '24/7 AI Customer Assistant', bn: '২৪/৭ এআই কাস্টমার সার্ভিস অ্যাসিস্ট্যান্ট' },
      description: {
        en: 'Train AI on your business knowledge. It handles customer inquiries day and night across OpenAI (GPT-4o), Google Gemini, and Anthropic Claude.',
        bn: 'আপনার ব্যবসার তথ্য দিয়ে AI ট্রেন করুন। দিনে ২৪ ঘণ্টা, সপ্তাহে ৭ দিন কাস্টমারের প্রশ্নের স্বয়ংক্রিয় নির্ভুল উত্তর দেবে AI।'
      },
      bullets: {
        en: ['Reduces support workload by 60-70%', 'Multi-engine support: GPT-4o, Gemini, Claude', 'Instant reply even at 2 AM midnight'],
        bn: ['সাপোর্ট স্টাফের কাজের চাপ ৬০-৭০% কমায়', 'মাল্টি এআই ইনজিন: GPT-4o, Gemini, Claude', 'রাত ২টায় মেসেজ আসলেও সাথে সাথে নির্ভুল উত্তর']
      }
    },
    {
      id: 'rag',
      iconName: 'FileText',
      colorTheme: 'purple',
      title: { en: 'RAG Knowledge Base & Auto-Crawl', bn: 'PDF/DOCX/ওয়েবসাইট থেকে AI ট্রেনিং (RAG)' },
      description: {
        en: 'Upload PDFs, Word docs, images (OCR), or paste your website URL — ZiniChat extracts data and trains your AI in under 2 minutes.',
        bn: 'PDF, Word ফাইল, ছবি (OCR) বা সরাসরি ওয়েবসাইটের URL দিলেই ZiniChat তথ্য স্ক্র্যাপ করে ২ মিনিটে AI ট্রেন করে ফেলে।'
      },
      bullets: {
        en: ['1-Click website auto-crawling & summarization', 'Zero Hallucination with vector HNSW retrieval', 'Product catalog & FAQ auto-indexing'],
        bn: ['১-ক্লিকে ওয়েবসাইট স্ক্র্যাপিং ও নলেজ সামারি', 'HNSW Vector search দিয়ে নির্ভুল তথ্য পরিবেশন', 'প্রোডাক্ট ক্যাটালগ ও FAQ অটো-মুখস্থ']
      }
    },
    {
      id: 'verticals',
      iconName: 'Building2',
      colorTheme: 'orange',
      title: { en: 'Multi-Vertical Adaptive AI (9 Industries)', bn: '৯টি ইন্ডাস্ট্রির জন্য বিশেষায়িত AI সিস্টেম' },
      description: {
        en: 'ZiniChat adapts dynamically to Retail, Real Estate, Healthcare, Education, Hospitality, Software, Financial, Manufacturing, and Logistics.',
        bn: 'রিটেইল, রিয়েল এস্টেট, হেলথকেয়ার, এডুকেশন, রেস্টুরেন্ট, সফটওয়্যার, ফাইন্যান্স, ম্যানুফ্যাকচারিং ও লজিস্টিকস — ৯টি সেক্টরে খাপ খায়।'
      },
      bullets: {
        en: ['Industry-specific terminology & workflows', 'Adapts UI labels: Products -> Doctors & Care / Courses', 'Targeted lead routing to specialized team members'],
        bn: ['প্রতিটি ইন্ডাস্ট্রির নিজস্ব ভাষা ও প্রসেস বোঝে', 'হেলথকেয়ারে "Doctors & Care", এডুকেশনে "Admissions"', 'বিশেষজ্ঞ টিম মেম্বারদের কাছে সরাসরি লিড রাউটিং']
      }
    },
    {
      id: 'broadcast',
      iconName: 'Send',
      colorTheme: 'teal',
      title: { en: 'WhatsApp Bulk Broadcast Campaign', bn: 'WhatsApp ব্রডকাস্ট ক্যাম্পেইন (৯৮% Open Rate)' },
      description: {
        en: 'Send bulk WhatsApp marketing messages with Meta Approved Templates & CSV import. Features Meta Graph API v25.0 optimization.',
        bn: 'Meta Approved টেমপ্লেট ও CSV কন্টাক্ট ইম্পোর্ট দিয়ে হাজার হাজার কাস্টমারকে একসাথে প্রমোশনাল WhatsApp মেসেজ পাঠান।'
      },
      bullets: {
        en: ['98% open rate compared to 22% email marketing', 'CSV contact import with sample template', 'Segment filtering by tags & automated queue'],
        bn: ['ইমেইল মার্কেটিংয়ের চেয়ে ৪.৫ গুণ বেশি ওপেন রেট', '১-ক্লিকে নমুনা CSV ও কন্টাক্ট বাল্ক ইম্পোর্ট', 'ট্যাগ অনুযায়ী নির্দিষ্ট কাস্টমার সেগমেন্টেশন']
      }
    },
    {
      id: 'facebook_comment_automation',
      iconName: 'MessageCircle',
      colorTheme: 'pink',
      title: { en: 'Facebook Comment Automation', bn: 'ফেসবুক কমেন্ট অটোমেশন (পাবলিক + প্রাইভেট DM)' },
      description: {
        en: 'Automatically reply to Facebook Page post comments with public replies and instant private Messenger DMs, capturing leads effortlessly.',
        bn: 'ফেসবুক পোস্টের কমেন্টে তাৎক্ষণিক পাবলিক অটো-রিপ্লাই এবং প্রাইভেট ইনবক্স Messenger DM পাঠিয়ে লিড কনভার্ট করুন।'
      },
      bullets: {
        en: ['Dual reply mode: Public Comment + Private Messenger DM', 'Captures comment leads directly into Live Inbox', 'Handles viral posts with 500+ comments automatically'],
        bn: ['পাবলিক কমেন্ট রিপ্লাই + প্রাইভেট মেসেঞ্জার ডিএম এক সাথে', 'কমেন্ট করা কাস্টমার স্বয়ংক্রিয় সিআরএম লিড হিসেবে সেভ', 'ভাইরাল পোস্টের শত শত কমেন্ট মুহূর্তেই রিপ্লাই']
      }
    },
    {
      id: 'website_widget',
      iconName: 'Globe',
      colorTheme: 'blue',
      title: { en: 'Website Live Chat Widget', bn: 'ওয়েবসাইট লাইভ চ্যাট উইজেট' },
      description: {
        en: 'Embed ZiniChat Live Chat on any website with 1 line of JS snippet. Convert site visitors into leads in real-time with AI & agent handoff.',
        bn: 'যেকোনো ওয়েবসাইটে একটিমাত্র JavaScript কোড বসিয়ে লাইভ চ্যাট চালুর সুবিধা। ওয়েবসাইট ভিজিটরদের সরাসরি লিডে কনভার্ট করুন।'
      },
      bullets: {
        en: ['Simple 1-line script installation', 'Full dark/light theme match & custom branding', 'Unified messages flowing into Omnichannel Inbox'],
        bn: ['মিনিটের মধ্যে ১-লাইন কোড কপি-পেস্ট ইনস্টলেশন', 'ব্র্যান্ড কালার ও থিম অনুযায়ী কাস্টমাইজেশন', 'ওয়েবসাইটের সব চ্যাট অমনিচ্যানেল ইনবক্সে প্রসেস']
      }
    },
    {
      id: 'commerce',
      iconName: 'ShoppingBag',
      colorTheme: 'green',
      title: { en: 'Native E-Commerce & Order Management', bn: 'ইনবক্সেই পণ্য বিক্রি ও অর্ডার ট্র্যাকিং' },
      description: {
        en: 'Sell products directly inside WhatsApp and Messenger chat without redirecting customers. AI calculates totals, checks stock, and creates orders in CRM.',
        bn: 'কাস্টমারকে অন্য ওয়েবসাইটে না পাঠিয়ে সরাসরি চ্যাটেই পণ্য বিক্রি করুন। এআই স্বয়ংক্রিয়ভাবে মোট হিসাব, স্টক চেক এবং অর্ডার তৈরি করে।'
      },
      bullets: {
        en: ['Automatic order creation during AI conversation', 'Real-time stock deduction & inventory checks', 'Order tracking & status updates in tenant panel'],
        bn: ['কাস্টমার চ্যাট করার সময় স্বয়ংক্রিয় অর্ডার প্লেসমেন্ট', 'রিয়েল-টাইম স্টক আপডেট ও ইনভেন্টরি ট্র্যাকিং', 'এক জায়গায় সব অর্ডারের স্ট্যাটাস ট্র্যাকিং']
      }
    },
    {
      id: 'mfs',
      iconName: 'CreditCard',
      colorTheme: 'teal',
      title: { en: 'bKash / Nagad / MFS Local Billing', bn: 'bKash, Nagad ও রকেটে সাবস্ক্রিপশন পেমেন্ট' },
      description: {
        en: 'No international credit card required! Subscribe to ZiniChat using bKash, Nagad, Rocket, or Bank Transfer with instant TrxID validation.',
        bn: 'ইন্টারন্যাশনাল কার্ড ছাড়াই bKash, Nagad, Rocket বা ব্যাংক ট্রান্সফার দিয়ে ZiniChat সাবস্ক্রাইব করুন। TrxID দিলেই অটো প্ল্যান চালু।'
      },
      bullets: {
        en: ['Instant TrxID verification for bKash & Nagad', 'EMVCo Bangla QR payload support', 'No Visa/Mastercard required for Bangladeshi merchants'],
        bn: ['bKash ও Nagad পেমেন্টের ইনস্ট্যান্ট TrxID ভেরিফিকেশন', 'বাংলা কিউআর (Bangla QR) পেমেন্ট সাপোর্ট', 'দেশি উদ্যোক্তাদের জন্য কার্ড ছাড়াই সাবস্ক্রিপশন']
      }
    },
    {
      id: 'mobile_pwa',
      iconName: 'Smartphone',
      colorTheme: 'purple',
      title: { en: 'Native Mobile PWA Experience', bn: 'মোবাইলেই চলে — PWA অ্যাপ (Android + iOS)' },
      description: {
        en: 'Install ZiniChat directly from browser to home screen as a PWA. Push notifications, bottom sheet modals, and mobile-native UI included.',
        bn: 'প্লে-স্টোর ছাড়াই ব্রাউজার থেকে সরাসরি মোবাইলের হোম স্ক্রিনে ইন্সটল করুন। লক স্ক্রিনে নোটিফিকেশন সহ ১০০% মোবাইল অপ্টিমাইজড।'
      },
      bullets: {
        en: ['Installable PWA with push notification support', 'Mobile native App view with bottom sheets', 'Manage business on mobile anywhere, anytime'],
        bn: ['হোম স্ক্রিন অ্যাপ ইনস্টলেশন ও পুশ নোটিফিকেশন', 'মোবাইল নেটিভ অ্যাপভিউ ও দ্রুত ব্যবহার সুবিধা', 'দোকানে না বসেও মোবাইলে পুরো ব্যবসা পরিচালনা']
      }
    },
    {
      id: 'security',
      iconName: 'ShieldCheck',
      colorTheme: 'blue',
      title: { en: 'Enterprise Grade Security & Audit Logs', bn: 'এন্টারপ্রাইজ গ্রেড সিকিউরিটি ও লজিন অডিট লগ' },
      description: {
        en: 'AES-256-CBC encryption for tokens, Meta Webhook HMAC-SHA256 verification, strict tenant isolation, and 90-day retention login audit logs.',
        bn: 'AES-256-CBC এনক্রিপশন, মেটা ওয়েবহুক HMAC ভেরিফিকেশন, ৯০ দিনের আইপি ও ব্রাউজার সহ সিকিউর লগইন অডিট লগ।'
      },
      bullets: {
        en: ['AES-256 encryption for API keys & tokens', '90-day automated TTL retention for security audit logs', 'Superadmin impersonation & role permissions'],
        bn: ['এপিআই কী ও সিক্রেট ডেটায় ব্যাংক-লেভেল এনক্রিপশন', '৯০ দিনের আইপি, ব্রাউজার ও লোকেশন লগইন রেকর্ডস', 'অনুমতি ছাড়া অন্য কেউ ডেটা দেখতে পারবে না']
      }
    },
    {
      id: 'byok',
      iconName: 'Key',
      colorTheme: 'green',
      title: { en: 'Bring Your Own Key (BYOK)', bn: 'নিজের AI Key ব্যবহার করার স্বাধীনতা (BYOK)' },
      description: {
        en: 'Use ZiniChat platform key or plug in your own OpenAI, Google Gemini, or Anthropic Claude API keys for total cost control.',
        bn: 'ZiniChat-এর নিজস্ব AI কী ব্যবহার করুন অথবা আপনার নিজস্ব OpenAI/Gemini/Claude API Key যুক্ত করে এআই কস্ট কন্ট্রোল করুন।'
      },
      bullets: {
        en: ['Bring your own OpenAI, Gemini, or Claude API key', 'Zero markup on official AI token consumption', 'Switch between Platform and Custom key at will'],
        bn: ['নিজের ওপেনএআই বা জেমিনি এপিআই কি ব্যবহারের সুবিধা', 'এআই টোকেনের ওপর কোনো অতিরিক্ত ফি নেই', 'প্রয়োজন অনুযায়ী যেকোনো সময় কি পরিবর্তন']
      }
    },
    {
      id: 'outreach',
      iconName: 'Mail',
      colorTheme: 'orange',
      title: { en: 'Zini-Mail: Fully Automated AI Email Marketing', bn: 'জিনি-মেইল: অটোমেটেড এআই ইমেইল মার্কেটিং (জিরো লিস্ট)' },
      description: {
        en: 'No email list or database needed! Simply enter your business type and location—AI automatically searches and finds verified target businesses, reads your offer poster, and sends personalized 1-on-1 marketing emails automatically.',
        bn: 'আপনার নিজস্ব কোনো ইমেইল লিস্ট বা ডেটাবেজ থাকা লাগবে না! শুধু ব্যবসার ক্যাটাগরি ও শহর লিখে দিন—AI নিজ থেকেই টার্গেট বায়ারদের ইমেইল ও ফোন খুঁজে বের করে অফার ব্যানার অনুযায়ী অটোমেটিক পার্সোনালাইজড ইমেইল পাঠিয়ে সেলস আনবে।'
      },
      bullets: {
        en: ['Zero Email List Needed — AI discovers real target businesses automatically', 'Vision AI scans your offer flyer/poster to craft 1-on-1 personalized emails', '1 email/min safe delivery + 1-Click WhatsApp follow-up for interested leads'],
        bn: ['নিজের কোনো ইমেইল লিস্ট বা পূর্ব অভিজ্ঞতার প্রয়োজন নেই — AI নিজ থেকেই টার্গেট লিড খুঁজে নেয়', 'প্রমোশনাল পোস্টার/ব্যানার রিড করে স্বয়ংক্রিয় প্রফেশনাল ১-টু-১ সেলস ইমেইল তৈরি', 'মিনিটে ১টি করে নিরাপদ মেইল সেন্ড ও লিংকে ক্লিক করা কাস্টমারদের ১-ক্লিকে হোয়াটসঅ্যাপে মেসেজ']
      }
    }
  ]
};

// In-flight promise cache to deduplicate simultaneous requests
let configPromise: Promise<any> | null = null;
let plansPromise: Promise<any[]> | null = null;
let cachedConfigData: any = null;
let cachedPlansData: any[] | null = null;
let configCacheTime = 0;
let plansCacheTime = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes client-side cache

export function getCachedLandingConfig(): Promise<any> {
  const now = Date.now();
  if (cachedConfigData && (now - configCacheTime < CACHE_TTL_MS)) {
    return Promise.resolve(cachedConfigData);
  }
  if (!configPromise) {
    configPromise = fetch(`${API}/landing-page/config`)
      .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
      })
      .then(data => {
        cachedConfigData = data;
        configCacheTime = Date.now();
        configPromise = null;
        return data;
      })
      .catch(err => {
        configPromise = null;
        return cachedConfigData || DEFAULT_FALLBACK_CONFIG;
      });
  }
  return configPromise;
}

export function getCachedPlans(): Promise<any[]> {
  const now = Date.now();
  if (cachedPlansData && (now - plansCacheTime < CACHE_TTL_MS)) {
    return Promise.resolve(cachedPlansData);
  }
  if (!plansPromise) {
    plansPromise = fetch(`${API}/packages/plans`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const sorted = (data || []).sort((a: any, b: any) => Number(a.priceMonthlyBdt) - Number(b.priceMonthlyBdt));
        cachedPlansData = sorted;
        plansCacheTime = Date.now();
        plansPromise = null;
        return sorted;
      })
      .catch(err => {
        plansPromise = null;
        return cachedPlansData || [];
      });
  }
  return plansPromise;
}
