const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.landingPageConfig.findFirst();
  if (config) {
    console.log('Updating config...');
    await prisma.landingPageConfig.update({
      where: { id: config.id },
      data: {
        featuresJson: [
          { 
            id: 'ai',
            iconName: 'Bot',
            colorTheme: 'green',
            title: { en: 'AI-Powered Auto Reply', bn: 'এআই অটো রিপ্লাই' }, 
            description: { 
              en: 'Train your own custom AI assistant on your product catalog, FAQs, and business knowledge. Automatically handle customer inquiries 24/7 without human intervention.', 
              bn: 'আপনার পণ্য ক্যাটালগ, FAQ এবং ব্যবসার তথ্য দিয়ে নিজস্ব AI অ্যাসিস্ট্যান্ট ট্রেইন করুন। ২৪/৭ স্বয়ংক্রিয়ভাবে গ্রাহকদের প্রশ্নের উত্তর দিন।' 
            },
            bullets: {
              en: ['Custom knowledge base training', 'Website content scraping', 'Bring Your Own API Key (BYOK)', 'Smart handoff to human agents', 'Context-aware conversations'],
              bn: ['কাস্টম নলেজ বেস ট্রেনিং', 'ওয়েবসাইট কন্টেন্ট স্ক্র্যাপিং', 'নিজের API Key ব্যবহার (BYOK)', 'মানব এজেন্টকে স্মার্ট হ্যান্ডঅফ', 'প্রসঙ্গ-সচেতন কথোপকথন']
            }
          },
          { 
            id: 'inbox',
            iconName: 'MessageSquare',
            colorTheme: 'blue',
            title: { en: 'Unified Omnichannel Inbox', bn: 'ইউনিফাইড অমনিচ্যানেল ইনবক্স' }, 
            description: { 
              en: 'Manage all customer conversations from WhatsApp, Meta Messenger, and Instagram DM in a single, powerful inbox. No more tab switching.', 
              bn: 'WhatsApp, Meta Messenger, এবং Instagram DM থেকে সব গ্রাহকের কথোপকথন একটি শক্তিশালী ইনবক্সে পরিচালনা করুন।' 
            },
            bullets: {
              en: ['WhatsApp Official Cloud API', 'Meta Messenger integration', 'Instagram Direct Messages', 'Real-time message sync', 'Media attachments (images, video)'],
              bn: ['WhatsApp Official Cloud API', 'Meta Messenger ইন্টিগ্রেশন', 'Instagram ডাইরেক্ট মেসেজ', 'রিয়েল-টাইম মেসেজ সিঙ্ক', 'মিডিয়া অ্যাটাচমেন্ট (ছবি, ভিডিও)']
            }
          },
          { 
            id: 'whatsapp_api',
            iconName: 'MessageCircle',
            colorTheme: 'green',
            title: { en: 'WhatsApp Business API', bn: 'হোয়াটসঅ্যাপ বিজনেস API' }, 
            description: { 
              en: 'Connect official WhatsApp Cloud API or pairing code based personal numbers. Send bulk broadcasts safely without risk of bans.', 
              bn: 'অফিসিয়াল হোয়াটসঅ্যাপ ক্লাউড API অথবা পেয়ারিং কোড দিয়ে পার্সোনাল নাম্বার সংযুক্ত করুন। কোনো প্রকার ব্যান হওয়া ছাড়াই নিরাপদে বাল্ক মেসেজ ব্রডকাস্ট করুন।' 
            },
            bullets: {
              en: ['Official Meta Cloud API', 'Personal WhatsApp pairing code', 'High-res image/video downloads', 'Verified green badge support', 'Anti-ban safety intervals'],
              bn: ['অফিসিয়াল মেটা ক্লাউড API', 'পার্সোনাল হোয়াটসঅ্যাপ পেয়ারিং কোড', 'হাই-রেস ছবি ও ভিডিও ডাউনলোড', 'ভেরিফাইড গ্রিন ব্যাজ সাপোর্ট', 'ব্যান প্রটেকশন এআই সেফটি']
            }
          },
          { 
            id: 'messenger_api',
            iconName: 'MessageSquare',
            colorTheme: 'blue',
            title: { en: 'Meta Messenger Integration', bn: 'মেটা মেসেঞ্জার ইন্টিগ্রেশন' }, 
            description: { 
              en: 'Connect unlimited Facebook Pages via Meta Login. Sync conversations in real-time, automate replies, and log leads directly in your CRM.', 
              bn: 'মেটা লগইন এর মাধ্যমে আনলিমিটেড ফেসবুক পেজ কানেক্ট করুন। রিয়েল-টাইমে কথোপকথন সিঙ্ক করুন, এআই রিপ্লাই সেট করুন এবং সরাসরি কাস্টমার প্রোফাইল CRM-এ সেভ করুন।' 
            },
            bullets: {
              en: ['One-click Facebook login', 'Automated Messenger inbox sync', 'Page welcome message setup', 'Instant private auto-replies', 'Collaborative multi-agent support'],
              bn: ['ওয়ান-ক্লিক ফেসবুক লগইন', 'অটোমেটেড মেসেঞ্জার ইনবক্স সিঙ্ক', 'পেজ ওয়েলকাম মেসেজ সেটআপ', 'ইনস্ট্যান্ট প্রাইভেট অটো-রিপ্লাই', 'একাধিক এজেন্ট কোলাবোরেশন']
            }
          },
          { 
            id: 'instagram_api',
            iconName: 'Instagram',
            colorTheme: 'pink',
            title: { en: 'Instagram Direct Messages', bn: 'ইনস্টাগ্রাম ডাইরেক্ট মেসেজ' }, 
            description: { 
              en: 'Automate Instagram Direct Messages, story mentions, and media replies. Engage customers instantly when they interact with your brand.', 
              bn: 'ইনস্টাগ্রাম ডাইরেক্ট মেসেজ, স্টোরি মেনশন এবং মিডিয়া রিপ্লাই স্বয়ংক্রিয় করুন। গ্রাহকরা আপনার ব্র্যান্ডের সাথে যুক্ত হওয়ার সাথে সাথেই দ্রুত উত্তর দিন।' 
            },
            bullets: {
              en: ['Instagram Story mention replies', 'Direct Messages (DM) sync', 'Product link auto-responses', 'Media attachment downloads', 'Interactive customer profile cards'],
              bn: ['স্টোরি মেনশন অটো-রিপ্লাই', 'ডাইরেক্ট মেসেজ (DM) সিঙ্ক', 'প্রোডাক্ট লিঙ্ক অটো-রেসপন্স', 'মিডিয়া অ্যাটাচমেন্ট ডাউনলোড', 'ইন্টারেক্টিভ কাস্টমার প্রোফাইল কার্ড']
            }
          },
          { 
            id: 'website_widget',
            iconName: 'Globe',
            colorTheme: 'teal',
            title: { en: 'Website Live Chat Widget', bn: 'ওয়েবসাইট লাইভ চ্যাট উইজেট' }, 
            description: { 
              en: 'Embed a beautiful, customizable live chat widget on your website. Allow visitors to chat with your AI or connect directly to human agents.', 
              bn: 'আপনার ওয়েবসাইটে একটি আকর্ষণীয় ও কাস্টমাইজড লাইভ চ্যাট উইজেট যুক্ত করুন। কাস্টমারদের এআই-এর সাথে কথা বলার সুবিধা দিন বা সরাসরি লাইভ এজেন্টের সাথে যুক্ত করুন।' 
            },
            bullets: {
              en: ['Custom bubble colors and icons', 'Bilingual greeting messages', 'AI auto-replies for website visitors', 'Seamless agent takeover', 'Zero-downtime widget updates'],
              bn: ['কাস্টম বাবল কালার ও আইকন', 'দ্বিভাষিক শুভেচ্ছা বার্তা', 'ভিজিটরদের জন্য এআই অটো-রিপ্লাই', 'স্মার্ট এজেন্ট টেকওভার সুবিধা', 'রিয়েল-টাইম উইজেট আপডেট']
            }
          },
          { 
            id: 'facebook_comment_automation',
            iconName: 'MessageSquare',
            colorTheme: 'orange',
            title: { en: 'Facebook Comment Automation', bn: 'ফেসবুক কমেন্ট অটোমেশন' },
            description: {
              en: 'Automatically reply to Facebook post comments with public replies and instant private messages in their Messenger inbox.',
              bn: 'ফেসবুক পোস্টের কমেন্টে পাবলিকলি রিপ্লাই দিন এবং মেসেঞ্জারে সাথে সাথেই অটোমেটিক প্রাইভেট মেসেজ পাঠিয়ে দিন।'
            },
            bullets: {
              en: ['Public & Private AI Reply Modes', 'Keyword-based Filtering', 'Commenter Rate Limiting', 'Lead CRM Auto-Sync', 'Full Reply logs & analytics'],
              bn: ['পাবলিক ও প্রাইভেট এআই রিপ্লাই', 'কীওয়ার্ড-ভিত্তিক ফিল্টারিং', 'কমেন্টার রেট লিমিটিং', 'লিড সিআরএম অটো-সিঙ্ক', 'কমেন্ট রিপ্লাই লগ ও অ্যানালিটিক্স']
            }
          },
          { 
            id: 'crm',
            iconName: 'Users',
            colorTheme: 'orange',
            title: { en: 'Built-in Leads CRM', bn: 'বিল্ট-ইন লিডস সিআরএম' }, 
            description: { 
              en: 'Track your sales pipeline visually with our built-in Kanban board. Schedule follow-ups, add notes, and convert leads into loyal customers easily.', 
              bn: 'আমাদের বিল্ট-ইন কানবান বোর্ডের সাহায্যে আপনার সেলস পাইপলাইন ট্র্যাক করুন। ফলো-আপ শিডিউল করুন, নোট যোগ করুন এবং লিডগুলোকে সহজে গ্রাহকে পরিণত করুন।' 
            },
            bullets: {
              en: ['Visual Kanban board', 'Automated follow-up reminders', 'Detailed contact profiles', 'Custom stage management', 'Lead assignment to team'],
              bn: ['ভিজ্যুয়াল কানবান বোর্ড', 'অটোমেটেড ফলো-আপ রিমাইন্ডার', 'বিস্তারিত কন্ট্যাক্ট প্রোফাইল', 'কাস্টম স্টেজ ম্যানেজমেন্ট', 'টিম মেম্বারদের লিড অ্যাসাইনমেন্ট']
            }
          },
          { 
            id: 'team',
            iconName: 'ShieldCheck',
            colorTheme: 'purple',
            title: { en: 'Team Collaboration & Roles', bn: 'টিম কোলাবোরেশন ও রোলস' }, 
            description: { 
              en: 'Invite your team members to manage customer support together. Assign specific roles and permissions to keep your data secure.', 
              bn: 'আপনার টিম মেম্বারদের একসাথে কাস্টমার সাপোর্ট পরিচালনা করতে আমন্ত্রণ জানান। আপনার ডেটা সুরক্ষিত রাখতে নির্দিষ্ট রোল ও পারমিশন সেট করুন।' 
            },
            bullets: {
              en: ['Role-based access control', 'Agent assignment for chats', 'Audit logs for superadmins', 'Real-time web notifications', 'Performance tracking'],
              bn: ['রোল-ভিত্তিক অ্যাক্সেস কন্ট্রোল', 'চ্যাটের জন্য এজেন্ট অ্যাসাইনমেন্ট', 'সুপারঅ্যাডমিনের জন্য অডিট লগ', 'রিয়েল-টাইম ওয়েব নোটিফিকেশন', 'পারফরম্যান্স ট্র্যাকিং']
            }
          }
        ],
        pricingJson: {
          compareFeatures: [
            { id: 'channels', type: 'header', en: 'Channels', bn: 'চ্যানেলসমূহ' },
            { id: 'whatsapp', type: 'boolean', featureKey: 'whatsapp', en: 'WhatsApp Business API', bn: 'হোয়াটসঅ্যাপ API' },
            { id: 'messenger', type: 'boolean', featureKey: 'messenger', en: 'Meta Messenger', bn: 'মেটা মেসেঞ্জার' },
            { id: 'ai', type: 'header', en: 'AI & Automation', bn: 'এআই ও অটোমেশন' },
            { id: 'ai_assistant', type: 'boolean', featureKey: 'ai_assistant', en: 'Custom AI Assistant', bn: 'কাস্টম এআই অ্যাসিস্ট্যান্ট' },
            { id: 'own_api', type: 'boolean', featureKey: 'own_api', en: 'Use Own OpenAI Key', bn: 'নিজস্ব OpenAI API Key' },
            { id: 'ai_quota', type: 'value', featureKey: 'aiQuota', en: 'Monthly AI Responses', bn: 'মাসিক এআই রেসপন্স' },
            { id: 'tools', type: 'header', en: 'Tools & CRM', bn: 'টুলস ও সিআরএম' },
            { id: 'lead_manage', type: 'boolean', featureKey: 'lead_manage', en: 'Leads CRM Pipeline', bn: 'লিডস সিআরএম পাইপলাইন' },
            { id: 'commerce', type: 'boolean', featureKey: 'commerce', en: 'E-Commerce & Orders', bn: 'ই-কমার্স ও অর্ডারস' },
            { id: 'limits', type: 'header', en: 'Limits', bn: 'লিমিটস' },
            { id: 'seats', type: 'value', featureKey: 'seatLimit', en: 'Team Members', bn: 'টিম মেম্বার' },
            { id: 'msg_quota', type: 'value', featureKey: 'messageQuota', en: 'Monthly Messages', bn: 'মাসিক মেসেজ' }
          ]
        },
        faqsJson: {
          categories: [
            { id: 'all', icon: 'Search', en: 'All Questions', bn: 'সব প্রশ্ন' },
            { id: 'general', icon: 'MessageCircleQuestion', en: 'General', bn: 'সাধারণ' },
            { id: 'ai', icon: 'Bot', en: 'AI Assistant', bn: 'এআই অ্যাসিস্ট্যান্ট' },
            { id: 'whatsapp', icon: 'MessageCircleQuestion', en: 'WhatsApp & Meta', bn: 'হোয়াটসঅ্যাপ ও মেটা' },
            { id: 'billing', icon: 'CreditCard', en: 'Pricing & Billing', bn: 'প্রাইসিং ও বিলিং' }
          ],
          faqs: [
            {
              categoryId: 'general',
              question: { en: 'What is ZiniChat?', bn: 'ZiniChat কী?' },
              answer: { 
                en: 'ZiniChat is an omnichannel AI assistant platform designed to automate customer support and sales via WhatsApp, Meta Messenger, and Instagram.',
                bn: 'ZiniChat হলো একটি অমনিচ্যানেল এআই অ্যাসিস্ট্যান্ট প্ল্যাটফর্ম যা হোয়াটসঅ্যাপ, মেটা মেসেঞ্জার এবং ইনস্টাগ্রামের মাধ্যমে কাস্টমার সাপোর্ট এবং সেলস স্বয়ংক্রিয় করতে ডিজাইন করা হয়েছে।' 
              }
            },
            {
              categoryId: 'general',
              question: { en: 'Can I add my team members?', bn: 'আমি কি আমার টিম মেম্বারদের অ্যাড করতে পারবো?' },
              answer: { 
                en: 'Yes! Depending on your subscription plan, you can invite multiple team members, assign them specific roles, and manage customer chats collaboratively.',
                bn: 'হ্যাঁ! আপনার সাবস্ক্রিপশন প্ল্যানের উপর ভিত্তি করে, আপনি একাধিক টিম মেম্বারকে ইনভাইট করতে পারবেন, তাদের নির্দিষ্ট পারমিশন দিতে পারবেন এবং একসাথে কাজ করতে পারবেন।' 
              }
            },
            {
              categoryId: 'ai',
              question: { en: 'How does the AI know about my business?', bn: 'AI আমার ব্যবসা সম্পর্কে কীভাবে জানবে?' },
              answer: { 
                en: 'You can provide the AI with your website URL, product PDFs, or custom text. The AI will read and learn this information to answer customer questions accurately.',
                bn: 'আপনি AI-কে আপনার ওয়েবসাইটের URL, পণ্যের PDF, বা কাস্টম টেক্সট প্রদান করতে পারেন। গ্রাহকদের প্রশ্নের সঠিকভাবে উত্তর দিতে AI এই তথ্যটি পড়বে এবং শিখবে।' 
              }
            },
            {
              categoryId: 'ai',
              question: { en: 'Can I use my own OpenAI API Key?', bn: 'আমি কি আমার নিজস্ব OpenAI API Key ব্যবহার করতে পারবো?' },
              answer: { 
                en: 'Yes, ZiniChat supports Bring Your Own Key (BYOK). By using your own API key, you can reduce AI quota limits from your platform usage.',
                bn: 'হ্যাঁ, ZiniChat-এ Bring Your Own Key (BYOK) সাপোর্টেড। নিজস্ব API key ব্যবহার করে আপনি প্ল্যাটফর্মের AI কোটা সাশ্রয় করতে পারবেন।' 
              }
            },
            {
              categoryId: 'whatsapp',
              question: { en: 'Does it support WhatsApp Official API?', bn: 'এটি কি অফিসিয়াল WhatsApp API সাপোর্ট করে?' },
              answer: { 
                en: 'Yes! We officially support the WhatsApp Cloud API for reliable, high-volume messaging and official Green Tick verification.',
                bn: 'হ্যাঁ! আমরা অফিসিয়াল WhatsApp Cloud API সাপোর্ট করি যা বিশ্বস্ত, হাই-ভলিউম মেসেজিং এবং অফিসিয়াল গ্রিন টিক ভেরিফিকেশনের জন্য সবচেয়ে ভালো।' 
              }
            },
            {
              categoryId: 'billing',
              question: { en: 'Can I test the platform for free?', bn: 'আমি কি প্ল্যাটফর্মটি ফ্রিতে টেস্ট করতে পারবো?' },
              answer: { 
                en: 'Absolutely! We offer a free trial period on select plans so you can experience the power of our omnichannel AI and CRM system before committing.',
                bn: 'অবশ্যই! আমরা নির্দিষ্ট প্ল্যানগুলোতে ফ্রি ট্রায়ালের সুবিধা দিচ্ছি, যাতে আপনি কোনো খরচ ছাড়াই আমাদের প্ল্যাটফর্মটির অভিজ্ঞতা নিতে পারেন।' 
              }
            },
            {
              categoryId: 'general',
              question: { en: 'Do I need coding skills to set up the AI Assistant?', bn: 'এআই অ্যাসিস্ট্যান্ট সেটআপ করার জন্য কি কোডিং জানা প্রয়োজন?' },
              answer: {
                en: 'Not at all! ZiniChat is a completely no-code platform. You can configure your AI, upload data, and integrate channels easily through our user-friendly dashboard.',
                bn: 'একদমই না! ZiniChat সম্পূর্ণ নো-কোড প্ল্যাটফর্ম। আপনি আমাদের ইউজার-ফ্রেন্ডলি ড্যাশবোর্ডের মাধ্যমে সহজেই আপনার এআই কনফিগার করতে, ডেটা আপলোড করতে এবং চ্যানেল ইন্টিগ্রেট করতে পারবেন।'
              }
            },
            {
              categoryId: 'general',
              question: { en: 'Can I manage Facebook and Instagram messages here?', bn: 'আমি কি এখান থেকে ফেসবুক এবং ইনস্টাগ্রাম মেসেজ ম্যানেজ করতে পারবো?' },
              answer: {
                en: 'Yes, our unified omnichannel inbox allows you to manage conversations from WhatsApp, Meta Messenger, and Instagram Direct Messages all in one place.',
                bn: 'হ্যাঁ, আমাদের ইউনিফাইড অমনিচ্যানেল ইনবক্সের মাধ্যমে আপনি হোয়াটসঅ্যাপ, মেটা মেসেঞ্জার এবং ইনস্টাগ্রাম ডাইরেক্ট মেসেজগুলো এক জায়গা থেকেই ম্যানেজ করতে পারবেন।'
              }
            },
            {
              categoryId: 'ai',
              question: { en: 'What happens if the AI does not know the answer?', bn: 'এআই যদি কোনো প্রশ্নের উত্তর না জানে, তখন কী হবে?' },
              answer: {
                en: 'ZiniChat features a smart handoff system. If the AI cannot answer a question, it will automatically pause and notify a human agent to take over the chat.',
                bn: 'ZiniChat-এ স্মার্ট হ্যান্ডঅফ সিস্টেম রয়েছে। এআই কোনো প্রশ্নের উত্তর না জানলে এটি স্বয়ংক্রিয়ভাবে পজ হয়ে যায় এবং একজন মানব এজেন্টকে চ্যাট চালিয়ে নেওয়ার জন্য নোটিফাই করে।'
              }
            },
            {
              categoryId: 'ai',
              question: { en: 'Does the AI support the Bengali language?', bn: 'এআই কি বাংলা ভাষা সাপোর্ট করে?' },
              answer: {
                en: 'Yes, our AI is highly capable of understanding and replying in Bengali, English, and other major languages seamlessly.',
                bn: 'হ্যাঁ, আমাদের এআই খুব সহজেই বাংলা, ইংরেজি এবং অন্যান্য প্রধান ভাষা বুঝতে এবং সেই ভাষায় রিপ্লাই দিতে পারে।'
              }
            },
            {
              categoryId: 'ai',
              question: { 
                en: 'Will the AI give wrong answers or offer unauthorized discounts?', 
                bn: 'এআই কি ভুল উত্তর বা ফেক ডিসকাউন্ট দেবে?' 
              },
              answer: { 
                en: 'No. ZiniChat uses an enterprise-grade anti-hallucination framework. The AI strictly follows your uploaded documents and Q&A. It is programmed to ask for a human agent if it is unsure, ensuring zero liability for your business.', 
                bn: 'না। ZiniChat এন্টারপ্রাইজ-গ্রেড অ্যান্টি-হ্যালুসিনেশন ফ্রেমওয়ার্ক ব্যবহার করে। এআই কঠোরভাবে আপনার আপলোড করা নথি এবং Q&A অনুসরণ করে। কোনো বিষয়ে নিশ্চিত না হলে এটি মানব এজেন্টের সহায়তা নেওয়ার জন্য প্রোগ্রাম করা হয়েছে, যা আপনার ব্যবসার জন্য শূন্য ঝুঁকি নিশ্চিত করে।' 
              }
            },
            {
              categoryId: 'whatsapp',
              question: { en: 'How secure is the Official WhatsApp API?', bn: 'অফিসিয়াল WhatsApp API কতটা নিরাপদ?' },
              answer: {
                en: 'The Official WhatsApp Cloud API is extremely secure and completely eliminates the risk of arbitrary number bans. It is officially supported by Meta and built for scale and bulk marketing.',
                bn: 'অফিসিয়াল WhatsApp Cloud API অত্যন্ত নিরাপদ এবং নাম্বার ব্যান হওয়ার ঝুঁকি সম্পূর্ণ দূর করে। এটি মেটার অফিসিয়াল সাপোর্টপ্রাপ্ত এবং বড় স্কেলে মেসেজ ও মার্কেটিংয়ের জন্য ডিজাইন করা হয়েছে।'
              }
            },
            {
              categoryId: 'whatsapp',
              question: { en: 'Can the system handle images, videos, and PDFs?', bn: 'সিস্টেমটি কি ছবি, ভিডিও এবং পিডিএফ সাপোর্ট করে?' },
              answer: {
                en: 'Yes, full media support is available. Customers can send attachments, and your agents or AI can process and reply with files, images, or documents.',
                bn: 'হ্যাঁ, ফুল মিডিয়া সাপোর্ট রয়েছে। কাস্টমাররা অ্যাটাচমেন্ট পাঠাতে পারবে, এবং আপনার এজেন্ট বা এআই ফাইল, ছবি বা ডকুমেন্টের মাধ্যমে রিপ্লাই দিতে পারবে।'
              }
            },
            {
              categoryId: 'billing',
              question: { en: 'What happens if I exceed my monthly message quota?', bn: 'আমার মাসিক মেসেজ কোটা শেষ হয়ে গেলে কী হবে?' },
              answer: {
                en: 'If you exceed your limit, outbound automated messages will be paused. You will be notified instantly and can upgrade to a higher plan to resume service.',
                bn: 'কোটা শেষ হয়ে গেলে আউটবাউন্ড এআই মেসেজ পাঠানো পজ হয়ে যাবে। আপনাকে সাথে সাথে নোটিফাই করা হবে এবং আপনি প্ল্যান আপগ্রেড করে সার্ভিসটি আবার চালু করতে পারবেন।'
              }
            },
            {
              categoryId: 'billing',
              question: { en: 'Are there any hidden setup charges?', bn: 'এর কি কোনো লুকানো সেটআপ চার্জ আছে?' },
              answer: {
                en: 'No, there are zero hidden setup charges. You only pay for your chosen monthly or yearly subscription plan.',
                bn: 'না, কোনো লুকানো সেটআপ চার্জ নেই। আপনি শুধু আপনার নির্বাচিত মাসিক বা বার্ষিক সাবস্ক্রিপশন প্ল্যানের জন্যই পেমেন্ট করবেন।'
              }
            }
          ]
        }
      }
    });
    console.log('Config updated successfully.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
