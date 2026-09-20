export type DocCategory = 'getting-started' | 'ai-training' | 'inbox-messaging' | 'sales-ecommerce' | 'billing-quotas' | 'settings';

export interface HelpArticle {
  id: string;
  titleEn: string;
  titleBn: string;
  category: DocCategory;
  tags: string[];
  excerptEn: string;
  excerptBn: string;
  planConditions: string;
  aiCreditCost: string;
  contentEn: string;
  contentBn: string;
}

export const helpCategories: { id: DocCategory; labelEn: string; labelBn: string; icon: string }[] = [
  { id: 'getting-started', labelEn: 'Getting Started', labelBn: 'শুরু করার গাইড', icon: 'Rocket' },
  { id: 'ai-training', labelEn: 'AI Training', labelBn: 'এআই ট্রেইনিং', icon: 'Bot' },
  { id: 'inbox-messaging', labelEn: 'Inbox & Messaging', labelBn: 'ইনবক্স ও মেসেজিং', icon: 'MessageSquare' },
  { id: 'sales-ecommerce', labelEn: 'Sales & E-Commerce', labelBn: 'সেলস ও ই-কমার্স', icon: 'ShoppingBag' },
  { id: 'billing-quotas', labelEn: 'Billing & Quotas', labelBn: 'বিলিং ও কোটা', icon: 'CreditCard' },
  { id: 'settings', labelEn: 'Settings & Team', labelBn: 'সেটিংস ও টিম', icon: 'Settings' }
];

export const helpDocs: HelpArticle[] = [
  {
    id: 'ai-training-basics',
    titleEn: 'How to Train Your AI Assistant (Persona & Q&A)',
    titleBn: 'কীভাবে আপনার এআই অ্যাসিস্ট্যান্টকে ট্রেইন করবেন',
    category: 'ai-training',
    tags: ['ai', 'training', 'persona', 'qna', 'auto-reply', 'এআই', 'ট্রেইনিং'],
    excerptEn: 'Learn how to set up your AI persona and add custom Q&As to automate customer replies.',
    excerptBn: 'আপনার এআই-এর পারসোনা কীভাবে সেট করবেন এবং প্রশ্ন-উত্তর যুক্ত করে মেসেজ অটোমেট করবেন তা জানুন।',
    planConditions: 'Available on all plans (Free, Starter, Growth, Scale).',
    aiCreditCost: '0 Credits for saving training data. 1 Credit deducted per automated AI reply in the inbox.',
    contentEn: `
### Overview
The AI Assistant needs to know about your business to reply accurately. You train it by giving it a **Persona** (a description of who it is) and **Q&As** (frequently asked questions).

### Step-by-Step Guide
1. Go to **Settings > AI Training** from the left sidebar.
2. Under the **Persona / System Prompt** section, write a detailed description of your business. Tell the AI how it should behave (e.g., polite, professional, casual).
3. Under the **Quick Q&A** section, click "+ Add Q&A" to add common questions your customers ask, along with the exact answers you want the AI to give.

![AI Training Setup](/docs/ai-training-setup.png)

### Pro Tips
* Be as descriptive as possible in the persona.
* The AI will automatically use the products you add in the Products section, so you don't need to manually write product prices in the Q&A!
    `,
    contentBn: `
### সাধারণ ধারণা
এআই অ্যাসিস্ট্যান্টকে আপনার ব্যবসা সম্পর্কে জানাতে হবে যেন সে কাস্টমারদের সঠিক উত্তর দিতে পারে। আপনি একটি **পারসোনা (Persona)** এবং **প্রশ্ন-উত্তর (Q&A)** দিয়ে একে ট্রেইন করতে পারবেন।

### কীভাবে ব্যবহার করবেন (Step-by-Step)
১. বামদিকের সাইডবার থেকে **Settings > AI Training**-এ যান।
২. **Persona / System Prompt** সেকশনে আপনার ব্যবসা সম্পর্কে বিস্তারিত লিখুন। এআই কীভাবে কথা বলবে (যেমন: ভদ্রভাবে, প্রফেশনালি) তা বলে দিন।
৩. **Quick Q&A** সেকশনে আপনার কাস্টমাররা সচরাচর যেসব প্রশ্ন করে সেগুলো যোগ করুন।

![এআই ট্রেইনিং সেটআপ](/docs/ai-training-setup.png)

### টিপস
* পারসোনা অংশে যত বিস্তারিত সম্ভব লিখুন।
* এআই অটোমেটিকভাবে আপনার অ্যাড করা প্রোডাক্টগুলো থেকে তথ্য নিয়ে কাস্টমারকে জানাবে, তাই প্রোডাক্টের দাম Q&A তে লেখার দরকার নেই!
    `
  },
  {
    id: 'connect-facebook-page',
    titleEn: 'How to Connect Facebook Page & Instagram',
    titleBn: 'ফেসবুক পেজ এবং ইনস্টাগ্রাম কীভাবে কানেক্ট করবেন',
    category: 'getting-started',
    tags: ['facebook', 'instagram', 'connect', 'page', 'messenger', 'ফেসবুক', 'ইনস্টাগ্রাম'],
    excerptEn: 'Step-by-step guide to connecting your Meta platforms to ZiniChat.',
    excerptBn: 'আপনার মেটা প্ল্যাটফর্মগুলো (ফেসবুক, ইনস্টাগ্রাম) ZiniChat-এর সাথে কানেক্ট করার বিস্তারিত নিয়ম।',
    planConditions: 'Available on all plans. Channel limits depend on your specific plan tier.',
    aiCreditCost: 'No AI credits are charged for connecting channels.',
    contentEn: `
### Overview
Connecting your Facebook Page allows ZiniChat to pull in all your Messenger and Instagram DM messages into one unified inbox.

### Step-by-Step Guide
1. Go to **Settings > Connected Inboxes** from the left menu.
2. Click the **+ Connect New Inbox** button at the top right.
3. Select **Facebook / Instagram** from the options.
4. Log into your Facebook account and select the pages and Instagram accounts you want to connect.
5. Click **Done**. Your pages will now appear in the Connected Channels list.

![Connect Channel](/docs/connect-channel.png)

### Important Conditions
* You must have **Admin access** to the Facebook page.
* Your Instagram account must be a **Professional/Business account** and linked to the Facebook page.
    `,
    contentBn: `
### সাধারণ ধারণা
ফেসবুক পেজ কানেক্ট করলে আপনার মেসেঞ্জার এবং ইনস্টাগ্রাম ডিএম (DM)-এর সব মেসেজ ZiniChat-এর একটি ইনবক্সে চলে আসবে।

### কীভাবে ব্যবহার করবেন (Step-by-Step)
১. বামদিকের মেনু থেকে **Settings > Connected Inboxes**-এ যান।
২. উপরের ডানদিকের **+ Connect New Inbox** বাটনে ক্লিক করুন।
৩. অপশন থেকে **Facebook / Instagram** সিলেক্ট করুন।
৪. আপনার ফেসবুক অ্যাকাউন্টে লগিন করুন এবং যেসব পেজ বা ইনস্টাগ্রাম অ্যাকাউন্ট কানেক্ট করতে চান সেগুলো সিলেক্ট করুন।
৫. **Done**-এ ক্লিক করুন।

![কানেক্ট চ্যানেল](/docs/connect-channel.png)

### গুরুত্বপূর্ণ শর্তাবলী
* আপনার ফেসবুক পেজে অবশ্যই **এডমিন (Admin) এক্সেস** থাকতে হবে।
* আপনার ইনস্টাগ্রাম অ্যাকাউন্টটি অবশ্যই **প্রফেশনাল/বিজনেস অ্যাকাউন্ট** হতে হবে এবং সেটি ফেসবুক পেজের সাথে লিংক করা থাকতে হবে।
    `
  }
];
