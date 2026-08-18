import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const OFFICIAL_FEATURES_JSON = [
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
    id: 'leads',
    iconName: 'Users',
    colorTheme: 'orange',
    title: { en: 'CRM Lead Board & Kanban Pipeline', bn: 'কাস্টমার লিড ম্যানেজমেন্ট ও কাটিবান পাইপলাইন' }, 
    description: { 
      en: 'AI automatically captures lead info during chat and places them into customized Kanban stages (New Lead -> Contacted -> Closed).', 
      bn: 'AI কাস্টমারের সাথে কথা বলার সময় লিড ইনফো চিনে নিয়ে কানবান বোর্ডে বিভিন্ন স্টেজে (নতুন লিড → কল করা হয়েছে → ক্লোজড) সাজিয়ে রাখে।' 
    },
    bullets: {
      en: ['Auto-extracted Bangladeshi phone numbers (01...)', 'Custom tags, contact notes & CSV lead export', 'Full activity audit trail for sales team'],
      bn: ['মেসেজ থেকে স্বয়ংক্রিয় ফোন নাম্বার এক্সট্রাকশন', 'কাস্টম ট্যাগ, নোটস এবং এক্সেল কন্টাক্ট এক্সপোর্ট', 'সেলস টিমের ট্র্যাকিং ও অ্যাক্টিভিটি হিস্ট্রি']
    }
  },
  { 
    id: 'commerce',
    iconName: 'ShoppingCart',
    colorTheme: 'green',
    title: { en: 'AI-Powered Order Management', bn: 'চ্যাটেই অটোমেটেড অর্ডার ও ক্যাটালগ ম্যানেজমেন্ট' }, 
    description: { 
      en: 'AI takes orders directly inside WhatsApp/Messenger chats, validates product price & stock, updates inventory, and notifies your team.', 
      bn: 'WhatsApp বা মেসেঞ্জারে কথা বলতে বলতেই AI অর্ডার তৈরি করে, স্টক আপডেট করে এবং টিমকে নোটিফাই করে।' 
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
      en: ['Supports OpenAI, Gemini, Claude, Groq & DeepSeek', 'Zero Vendor Lock-in with complete cost independence', 'Switch models anytime from dashboard settings'],
      bn: ['OpenAI, Gemini, Claude ও DeepSeek কী সাপোর্ট', 'নিজের এপিআই ভলিউম ডিসকাউন্ট ব্যবহারে সুযোগ', 'যেকোনো সময় ড্যাশবোর্ড থেকে মডেল পরিবর্তনের সুবিধা']
    }
  }
];

const OFFICIAL_FAQS_JSON = {
  categories: [
    { id: 'all', icon: 'Search', en: 'All Questions', bn: 'সব প্রশ্ন' },
    { id: 'general', icon: 'MessageCircleQuestion', en: 'General & Overview', bn: 'সাধারণ ধারণা' },
    { id: 'channels', icon: 'Share2', en: 'Messaging Channels', bn: 'মেসেজিং চ্যানেলসমূহ' },
    { id: 'ai', icon: 'Bot', en: 'AI Assistant & Training', bn: 'এআই অ্যাসিস্ট্যান্ট ও ট্রেনিং' },
    { id: 'verticals', icon: 'Building2', en: 'Industry Solutions', bn: 'ইন্ডাস্ট্রি ও সিস্টেম' },
    { id: 'pricing', icon: 'Receipt', en: 'Pricing & Quota', bn: 'বিলিং ও পেমেন্ট' },
    { id: 'security', icon: 'ShieldCheck', en: 'Security & Team', bn: 'সিকিউরিটি ও টিম' }
  ],
  faqs: [
    // General
    { 
      categoryId: 'general',
      question: { en: 'What is ZiniChat and how does it help my business?', bn: 'ZiniChat কী এবং এটি আমার ব্যবসার কীভাবে উন্নয়ন ঘটায়?' }, 
      answer: { 
        en: 'ZiniChat is an all-in-one Omnichannel AI Business Assistant SaaS. It connects your WhatsApp, Facebook Messenger, Instagram DM, and Website Chat into a single Unified Inbox, while training an AI assistant to handle customer inquiries, place orders, and manage leads 24/7.', 
        bn: 'ZiniChat হলো একটি অল-ইন-ওয়ান অমনিচ্যানেল AI বিজনেস অ্যাসিস্ট্যান্ট। এটি আপনার WhatsApp, Facebook Messenger, Instagram DM এবং ওয়েবসাইটের সমস্ত মেসেজকে একটি ইউনিফাইড ইনবক্সে নিয়ে আসে এবং একটি AI অ্যাসিস্ট্যান্টকে আপনার ব্যবসার তথ্য দিয়ে ট্রেইন করে ২৪/৭ কাস্টমার সাপোর্ট ও সেলস অটোমেট করে।' 
      } 
    },
    { 
      categoryId: 'general',
      question: { en: 'Do I need technical skills or coding knowledge to set up ZiniChat?', bn: 'ZiniChat সেটআপ করার জন্য কি কোনো কোডিং বা টেকনিক্যাল দক্ষতার প্রয়োজন আছে?' }, 
      answer: { 
        en: 'Not at all! ZiniChat is built for business owners. You can connect your Facebook Page or Instagram in 1 click, link WhatsApp Web via QR code, and train your AI simply by uploading a PDF or pasting your website URL in under 2 minutes.', 
        bn: 'একদমই না! ZiniChat সাধারণ উদ্যোক্তাদের জন্য তৈরি। ১-ক্লিকে ফেসবুক পেজ বা ইনস্টাগ্রাম কানেক্ট করা যায়, QR কোড স্ক্যান করে হোয়াটসঅ্যাপ এবং PDF বা ওয়েবসাইটের URL দিয়ে ২ মিনিটেই AI সেটআপ করা যায়।' 
      } 
    },
    { 
      categoryId: 'general',
      question: { en: 'Can I use ZiniChat on my mobile phone?', bn: 'আমি কি আমার মোবাইল ফোন থেকে ZiniChat ব্যবহার করতে পারব?' }, 
      answer: { 
        en: 'Yes! ZiniChat is a Progressive Web App (PWA). You can install it directly from your mobile browser (Android & iOS) to your home screen. It comes with native mobile app layouts, lock-screen push notifications, and bottom-sheet controls so you can manage your business on the go.', 
        bn: 'হ্যাঁ! ZiniChat একটি PWA (Progressive Web App)। অ্যাপ স্টোরে না গিয়েও সরাসরি ব্রাউজার থেকে আপনার মোবাইল হোম স্ক্রিনে ইনস্টল করতে পারবেন। এতে লক-স্ক্রিন পুশ নোটিফিকেশন এবং মোবাইল অপ্টিমাইজড ভিউ আছে।' 
      } 
    },

    // Channels
    { 
      categoryId: 'channels',
      question: { en: 'Which messaging channels are supported by ZiniChat?', bn: 'ZiniChat-এ কোন কোন মেসেজিং চ্যানেল সাপোর্ট করে?' }, 
      answer: { 
        en: 'ZiniChat supports Official WhatsApp Cloud API, WhatsApp Web (QR code scan), Facebook Messenger, Instagram Direct DM, Facebook Comment Automation (Public & Private DM reply), and Website Live Chat Widget.', 
        bn: 'ZiniChat সাপোর্ট করে: Official WhatsApp Cloud API, WhatsApp Web (QR স্ক্যান), Facebook Messenger, Instagram Direct DM, Facebook Comment Automation (পাবলিক কমেন্ট + প্রাইভেট DM) এবং Website Live Chat Widget।' 
      } 
    },
    { 
      categoryId: 'channels',
      question: { en: 'How does Facebook Comment Automation work?', bn: 'ফেসবুক কমেন্ট অটোমেশন (Facebook Comment Automation) কীভাবে কাজ করে?' }, 
      answer: { 
        en: 'When someone comments on your Facebook Page posts (e.g. asking "Price?"), ZiniChat AI automatically posts a public reply on the post AND sends a private Messenger DM directly to the customer with price and product details, converting the commenter into a chat lead.', 
        bn: 'আপনার ফেসবুক পেজের যেকোনো পোস্টে কেউ কমেন্ট করলে (যেমন: "দাম কত?") ZiniChat AI স্বয়ংক্রিয়ভাবে পোস্টে একটি পাবলিক কমেন্ট রিপ্লাই দেয় এবং একই সাথে কাস্টমারের প্রাইভেট মেসেঞ্জার ইনবক্সে বিস্তারিত লিংক সহ মেসেজ পাঠিয়ে দেয়।' 
      } 
    },
    { 
      categoryId: 'channels',
      question: { en: 'How does WhatsApp Bulk Broadcast Campaign work?', bn: 'WhatsApp ব্রডকাস্ট ক্যাম্পেইন দিয়ে কীভাবে বাল্ক মেসেজ পাঠানো যায়?' }, 
      answer: { 
        en: 'Using Meta Approved WhatsApp Marketing Templates (Graph API v25.0), you can upload a CSV contact list and send bulk promotional offers to thousands of customers at once. WhatsApp boasts a 98% open rate compared to 22% in email marketing.', 
        bn: 'Meta Approved হোয়াটসঅ্যাপ মার্কেটিং টেমপ্লেট ব্যবহার করে CSV ফাইল আপলোড করে হাজার হাজার কাস্টমারকে একসাথে অফার পাঠাতে পারবেন। এর ওপেন রেট ৯৮% — যা ইমেইল মার্কেটিংয়ের ২২%-এর চেয়ে ৪.৫ গুণ বেশি।' 
      } 
    },

    // AI Assistant
    { 
      categoryId: 'ai',
      question: { en: 'How do I train AI using my website URL or business documents?', bn: 'ওয়েবসাইট URL বা পিডিএফ ডকুমেন্ট দিয়ে কীভাবে AI-কে ট্রেইন করব?' }, 
      answer: { 
        en: 'Go to Dashboard -> Settings -> AI Training. You can paste your website URL and click "Fetch Website Knowledge" — ZiniChat automatically crawls key pages, extracts product & service details, and trains the AI. You can also upload PDF catalog files or type custom Q&As.', 
        bn: 'ড্যাশবোর্ডের Settings -> AI Training পেজে গিয়ে আপনার ওয়েবসাইট URL বসিয়ে "Fetch Website Knowledge" বাটনে ক্লিক করলেই ZiniChat ওয়েবসাইটের বিভিন্ন পেজ স্ক্র্যাপ করে অটোমেটিক এআই নলেজ বেসে ট্রেনিং সম্পন্ন করবে। অথবা যেকোনো PDF ফাইল আপলোড করেও ট্রেইন করানো যায়।' 
      } 
    },
    { 
      categoryId: 'ai',
      question: { en: 'Will the AI hallucinate or give wrong prices to customers?', bn: 'এআই কি মনগড়া বা ভুল তথ্য/দাম কাস্টমারকে বলতে পারে (AI Hallucination)?' }, 
      answer: { 
        en: 'No! ZiniChat uses an advanced RAG (Retrieval-Augmented Generation) system with pgvector HNSW indexing. The AI only responds using the exact knowledge base, products, and prices provided by you. If it encounters a question outside its training, it hands off smoothly to your human agent.', 
        bn: 'না! ZiniChat-এ এডভান্সড RAG (Vector HNSW Retrieval) ও অ্যান্টি-হ্যালোসিনেশন সিকিউরিটি আছে। এআই কেবল আপনার দেওয়া ক্যাটালগ ও নলেজ বেস থেকেই উত্তর দেয়। অজানা কোনো প্রশ্ন পেলে স্বয়ংক্রিয়ভাবে হিউম্যান এজেন্টের কাছে ট্রান্সফার করে।' 
      } 
    },
    { 
      categoryId: 'ai',
      question: { en: 'What is BYOK (Bring Your Own Key) mode?', bn: 'BYOK (Bring Your Own Key) কী এবং এটি কেন উপকারী?' }, 
      answer: { 
        en: 'BYOK allows you to connect your own API Key from OpenAI (GPT-4o), Google Gemini, Anthropic Claude, Groq, or DeepSeek. This gives enterprise users total cost independence, higher volume limits, and freedom from vendor lock-in.', 
        bn: 'BYOK মোডে আপনি ZiniChat-এর নিজস্ব এআই কী-এর বদলে আপনার নিজস্ব OpenAI, Google Gemini বা Claude API Key বসাতে পারবেন। এতে খরচ সম্পূর্ণ আপনার নিয়ন্ত্রণে থাকে এবং ভলিউম ডিসকাউন্ট পাওয়া যায়।' 
      } 
    },

    // Verticals
    { 
      categoryId: 'verticals',
      question: { en: 'Is ZiniChat only for e-commerce, or does it support other industries?', bn: 'ZiniChat কি শুধু ই-কমার্সের জন্য নাকি অন্য ইন্ডাস্ট্রিতেও ব্যবহার করা যাবে?' }, 
      answer: { 
        en: 'ZiniChat has native Multi-Vertical Adaptive AI for 9 distinct industries: Retail/E-commerce, Real Estate, Healthcare/Clinics, Education/Academies, Hospitality/Restaurants, Tech/Software, Financial Services, Manufacturing/B2B, and Freight/Logistics.', 
        bn: 'ZiniChat ৯টি ভিন্ন ইন্ডাস্ট্রির জন্য বিশেষায়িত: রিটেইল, রিয়েল এস্টেট, হেলথকেয়ার/ক্লিনিক, এডুকেশন, রেস্টুরেন্ট/হোটেল, টেক/সফটওয়্যার, ফাইন্যান্সিয়াল সার্ভিস, ম্যানুফ্যাকচারিং এবং লজিস্টিক্স।' 
      } 
    },
    { 
      categoryId: 'verticals',
      question: { en: 'How does Multi-Vertical AI change its behavior for clinics or colleges?', bn: 'ক্লিনিক বা কলেজের ক্ষেত্রে AI কীভাবে তার আচরণ ও শব্দ পরিবর্তন করে?' }, 
      answer: { 
        en: 'The system adapts interface labels, system prompts, and CRM actions automatically. For Healthcare, "Products" becomes "Doctors & Care Services" and AI offers doctor appointments. For Education, "Orders" becomes "Admissions". For B2B, it captures RFQ quotations.', 
        bn: 'ভার্টিকাল মোড অন করলেই প্ল্যাটফর্মের লেবেল ও AI প্রম্পট বদলে যায়। হেলথকেয়ারে "Products"-এর জায়গায় "Doctors & Care", এডুকেশনে "Orders"-এর জায়গায় "Admissions" দেখায় এবং সে অনুযায়ী লিড কাস্টম টিম এজেন্টের কাছে পাঠায়।' 
      } 
    },

    // Pricing & Billing
    { 
      categoryId: 'pricing',
      question: { en: 'How can I pay for ZiniChat subscription in Bangladesh?', bn: 'বাংলাদেশ থেকে ZiniChat-এর সাবস্ক্রিপশন পেমেন্ট কীভাবে করব?' }, 
      answer: { 
        en: 'You can pay instantly using bKash, Nagad, Rocket, EMVCo Bangla QR, or Direct Bank Transfer. Simply submit your payment TrxID in the ZiniChat billing panel, and your plan is activated automatically. No international credit card required!', 
        bn: 'আন্তর্জাতিক ক্রেডিট কার্ড ছাড়াই bKash, Nagad, Rocket বা ব্যাংক ট্রান্সফার দিয়ে ZiniChat সাবস্ক্রাইব করতে পারবেন। পেমেন্ট করার পর TrxID দিলেই তাৎক্ষণিক অটোমেশনের মাধ্যমে আপনার অ্যাকাউন্ট একটিভ হয়ে যাবে।' 
      } 
    },
    { 
      categoryId: 'pricing',
      question: { en: 'Does unused message or AI quota carry forward to the next month?', bn: 'অব্যবহৃত মেসেজ বা এআই রেসপন্স কোটা কি পরের মাসে ক্যারি ফরওয়ার্ড (Carry Forward) হবে?' }, 
      answer: { 
        en: 'Yes! For all paid plans, any unused AI response or total message balance will automatically carry forward when you renew your subscription for the next month. However, for the Free (0 BDT) plan, unused quotas reset each month.', 
        bn: 'হ্যাঁ! যেকোনো পেইড প্ল্যানে রিনিউ করলে আপনার আগের মাসের অব্যবহৃত এআই রেসপন্স ও মেসেজ কোটা স্বয়ংক্রিয়ভাবে পরের মাসে যোগ (Carry Forward) হবে। তবে ফ্রি (০ টাকা) প্ল্যানের ক্ষেত্রে অব্যবহৃত কোটা পরবর্তী মাসে রিসেট হয়ে যাবে।' 
      } 
    },

    // Security & Roles
    { 
      categoryId: 'security',
      question: { en: 'How secure is my business and customer data in ZiniChat?', bn: 'ZiniChat-এ আমার ব্যবসা ও কাস্টমারের ডেটা কতটা সুরক্ষিত?' }, 
      answer: { 
        en: 'ZiniChat employs bank-level enterprise security: AES-256-CBC encryption for stored API keys, Meta Webhook HMAC-SHA256 signature verification, tenant-isolated DB queries, and 90-day retention login audit logs with IP and browser tracking.', 
        bn: 'ZiniChat-এ ব্যাংক-গ্রেড সিকিউরিটি এনক্রিপশন (AES-256-CBC) ব্যবহার করা হয়। মেটা ওয়েবহুক HMAC সিকিউরিটি, পৃথক ডাটাবেস সিকিউরিটি ফিল্টার এবং ৯০ দিনের আইপি ও ব্রাউজার সহ লগইন অডিট লগ থাকে।' 
      } 
    },
    { 
      categoryId: 'security',
      question: { en: 'Can I add my team members with custom permissions?', bn: 'আমি কি আমার টিমের জন্য আলাদা রোল ও পার্মিশন দিতে পারব?' }, 
      answer: { 
        en: 'Yes! You can invite team members as Owner, Admin, or Agent. Assign specific conversations to specific agents, set Specialization Tags (e.g. Doctor Assistant, Property Agent) for automatic AI routing, and view team activity logs.', 
        bn: 'হ্যাঁ! Owner, Admin, বা Agent রোলে টিম মেম্বারদের ইনভাইট করা যায়। নির্দিষ্ট কাস্টমার চ্যাট নির্দিষ্ট এজেন্টের কাছে অ্যাসাইন করা যায় এবং Specialization Tags দিয়ে AI লিড অটোমেটিক নির্দিষ্ট এজেন্টের কাছে পাঠানো যায়।' 
      } 
    }
  ]
};

@Injectable()
export class LandingPageService {
  constructor(private prisma: PrismaService) {}

  async getConfig() {
    let config = await this.prisma.landingPageConfig.findFirst();
    if (!config) {
      // Create default config if it doesn't exist
      config = await this.prisma.landingPageConfig.create({
        data: {
          heroTitle: 'Supercharge Your Business with AI',
          heroTitleBn: 'এআই দিয়ে আপনার ব্যবসাকে শক্তিশালী করুন',
          heroSubtitle: 'The ultimate omnichannel platform for WhatsApp, Messenger, and Instagram.',
          heroSubtitleBn: 'হোয়াটসঅ্যাপ, মেসেঞ্জার এবং ইনস্টাগ্রামের জন্য সেরা অমনিচ্যানেল প্ল্যাটফর্ম।',
          featuresJson: OFFICIAL_FEATURES_JSON,
          pricingJson: {
            compareFeatures: [
              { id: 'limits', type: 'header', en: 'Limits', bn: 'লিমিটস' },
              { id: 'seats', type: 'value', featureKey: 'seatLimit', en: 'Team Members', bn: 'টিম মেম্বার' },
              { id: 'msg_quota', type: 'value', featureKey: 'messageQuota', en: 'Monthly Messages', bn: 'মাসিক মেসেজ' },
              { id: 'ai_quota', type: 'value', featureKey: 'aiQuota', en: 'AI Responses', bn: 'এআই রেসপন্স' },
              
              { id: 'channels', type: 'header', en: 'Channels', bn: 'চ্যানেলসমূহ' },
              { id: 'whatsapp_qr', type: 'boolean', featureKey: 'whatsapp_qr', en: 'WhatsApp Web (QR)', bn: 'হোয়াটসঅ্যাপ ওয়েব (QR)' },
              { id: 'website_widget', type: 'boolean', featureKey: 'website_widget', en: 'Website Widget', bn: 'ওয়েবসাইট উইজেট' },
              { id: 'whatsapp', type: 'boolean', featureKey: 'whatsapp', en: 'Official WhatsApp API', bn: 'অফিসিয়াল হোয়াটসঅ্যাপ API' },
              { id: 'messenger', type: 'boolean', featureKey: 'messenger', en: 'Meta Messenger', bn: 'মেটা মেসেঞ্জার' },
              { id: 'instagram_dm', type: 'boolean', featureKey: 'instagram_dm', en: 'Instagram DM', bn: 'ইনস্টাগ্রাম ডিএম' },

              { id: 'features_hdr', type: 'header', en: 'Features', bn: 'ফিচারসমূহ' },
              { id: 'ai_assistant', type: 'boolean', featureKey: 'ai_assistant', en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' },
              { id: 'lead_manage', type: 'boolean', featureKey: 'lead_manage', en: 'Leads CRM', bn: 'লিডস সিআরএম' },
              { id: 'contact_labels', type: 'boolean', featureKey: 'contact_labels', en: 'Custom Contact Labels', bn: 'কাস্টম কন্টাক্ট লেবেল' },
              { id: 'team_management', type: 'boolean', featureKey: 'team_management', en: 'Team Members & Roles', bn: 'টিম মেম্বার ও রোলস' },
              { id: 'commerce', type: 'boolean', featureKey: 'commerce', en: 'Products & Orders', bn: 'প্রোডাক্টস ও অর্ডার' },
              { id: 'broadcast', type: 'boolean', featureKey: 'broadcast', en: 'Broadcast Campaign', bn: 'ব্রডকাস্ট ক্যাম্পেইন' },
              { id: 'allowByok', type: 'boolean', featureKey: 'allowByok', en: 'Bring Your Own Key (BYOK)', bn: 'নিজের এপিআই কী (BYOK)' },
              { id: 'platform_support_ai', type: 'boolean', featureKey: 'platform_support_ai', en: 'Priority AI Support', bn: 'প্রায়োরিটি সাপোর্ট' }
            ]
          },
          faqsJson: OFFICIAL_FAQS_JSON,
          privacyPolicyJson: {
            en: 'Your Privacy Policy goes here. Edit this from the Superadmin dashboard.',
            bn: 'আপনার প্রাইভেসি পলিসি এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          termsConditionsJson: {
            en: 'Your Terms & Conditions go here. Edit this from the Superadmin dashboard.',
            bn: 'আপনার শর্তাবলী এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          dataDeletionJson: {
            en: 'Instructions for user data deletion go here. Edit this from the Superadmin dashboard.',
            bn: 'ব্যবহারকারীর ডেটা মুছে ফেলার নির্দেশাবলী এখানে থাকবে। সুপারঅ্যাডমিন ড্যাশবোর্ড থেকে এটি এডিট করুন।'
          },
          contactInfo: {
            address: { 
              en: '#386, Uttar Badda, Dhaka-1212, Bangladesh', 
              bn: '#৩৮৬, উত্তর বাড্ডা, ঢাকা-১২১২, বাংলাদেশ' 
            },
            email: 'info@zinichat.com',
            phone: '01533894967'
          },
          socialLinksJson: {
            facebook: { url: 'https://facebook.com', enabled: true },
            twitter: { url: 'https://twitter.com', enabled: true },
            linkedin: { url: 'https://linkedin.com', enabled: true },
            instagram: { url: 'https://instagram.com', enabled: true },
            whatsapp: { url: 'https://wa.me/8801533894967', enabled: true }
          }
        }
      });
    } else {
      // Ensure latest official features and FAQs are synced in DB if DB contains older/outdated feature items
      const existingFeatures = (config.featuresJson as any[]) || [];
      const existingFaqs = ((config.faqsJson as any)?.faqs as any[]) || [];
      
      let needsUpdate = false;
      const updatedData: any = {};

      if (existingFeatures.length < 8) {
        updatedData.featuresJson = OFFICIAL_FEATURES_JSON;
        needsUpdate = true;
      }

      if (existingFaqs.length < 8) {
        updatedData.faqsJson = OFFICIAL_FAQS_JSON;
        needsUpdate = true;
      }

      const current = (config.contactInfo as any) || {};
      if (current.email === 'hello@zinichat.com' || current.phone === '+880 1700 000 000' || current.phone === '+880 1234 567 890' || !current.address?.en?.includes('Badda')) {
        updatedData.contactInfo = {
          address: { 
            en: '#386, Uttar Badda, Dhaka-1212, Bangladesh', 
            bn: '#৩৮৬, উত্তর বাড্ডা, ঢাকা-১২১২, বাংলাদেশ' 
          },
          email: 'info@zinichat.com',
          phone: '01533894967'
        };
        needsUpdate = true;
      }

      if (needsUpdate) {
        config = await this.prisma.landingPageConfig.update({
          where: { id: config.id },
          data: updatedData
        });
      }
    }
    return config;
  }

  async updateConfig(data: any) {
    const config = await this.getConfig();
    return this.prisma.landingPageConfig.update({
      where: { id: config.id },
      data
    });
  }
}
