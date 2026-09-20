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
  /* ---------------- GETTING STARTED ---------------- */
  {
    id: 'connect-facebook-page',
    titleEn: 'How to Connect Facebook Page & Instagram DM',
    titleBn: 'ফেসবুক পেজ এবং ইনস্টাগ্রাম কীভাবে কানেক্ট করবেন',
    category: 'getting-started',
    tags: ['facebook', 'instagram', 'connect', 'page', 'messenger', 'meta', 'ফেসবুক', 'ইনস্টাগ্রাম'],
    excerptEn: 'Step-by-step guide to connecting your Meta Messenger and Instagram DM channels to ZiniChat via Official Meta Graph API.',
    excerptBn: 'অফিসিয়াল মেটা গ্রাফ এপিআই-এর মাধ্যমে আপনার মেসেঞ্জার ও ইনস্টাগ্রাম ডিএম ZiniChat-এর সাথে কানেক্ট করার বিস্তারিত নিয়ম।',
    planConditions: 'Available on all plans (Free, Starter, Growth, Scale). Channel limits depend on plan tier.',
    aiCreditCost: '0 AI Credits charged for channel connection.',
    contentEn: `
### Overview
ZiniChat is an **Official Meta Tech Provider**. Connecting your Facebook Page allows ZiniChat to pull all Messenger conversations and Instagram DMs into a single unified inbox.

### Step-by-Step Guide
1. Go to **Settings > Connected Inboxes** from the left navigation menu.
2. Click **+ Connect New Inbox** at the top right.
3. Select **Facebook / Instagram** from the available channels list.
4. Log into your Facebook account in the Meta authorization popup.
5. Select the Facebook Pages and Instagram Professional accounts you wish to connect.
6. Grant the requested permissions and click **Done**. Your pages will immediately sync and appear under Connected Channels.

![Connect Meta Channel](/docs/connect-channel.svg)

### Key Requirements & Tips
* You must have **Admin access** to the target Facebook page.
* Your Instagram account must be a **Business or Creator account** linked to your Facebook page.
* No plain text credentials or passwords are saved. Auth uses secure Meta OAuth tokens.
`,
    contentBn: `
### সাধারণ ধারণা
ZiniChat একটি **অফিসিয়াল মেটা টেক প্রোভাইডার**। আপনার ফেসবুক পেজ ও ইনস্টাগ্রাম কানেক্ট করলে সব কাস্টমার ইনকোয়ারি এবং ডিএম মেসেজ একটি ইউনিফাইড ইনবক্সে চলে আসবে।

### কীভাবে কানেক্ট করবেন (Step-by-Step)
১. বামদিকের সাইডবার থেকে **Settings > Connected Inboxes**-এ যান।
২. উপরের ডানদিকের **+ Connect New Inbox** বাটনে ক্লিক করুন।
৩. অপশন থেকে **Facebook / Instagram** সিলেক্ট করুন।
৪. মেটা পপ-আপ উইন্ডোতে আপনার ফেসবুক অ্যাকাউন্টে লগইন করুন।
৫. যেসব পেজ এবং ইনস্টাগ্রাম বিজনেস অ্যাকাউন্ট কানেক্ট করতে চান সেগুলো টিক দিয়ে সিলেক্ট করুন।
৬. **Done** বাটনে ক্লিক করুন। পেজটি সাথে সাথে ইনবক্স লিস্টে যুক্ত হয়ে যাবে।

![কানেক্ট মেটা চ্যানেল](/docs/connect-channel.svg)

### প্রয়োজনীয় শর্তাবলী
* আপনার ফেসবুক পেজে অবশ্যই **Admin access** থাকতে হবে।
* ইনস্টাগ্রাম অ্যাকাউন্টটি অবশ্যই **Business/Creator Account** এবং ফেসবুক পেজের সাথে লিংক করা থাকতে হবে।
`
  },
  {
    id: 'connect-whatsapp-baileys',
    titleEn: 'How to Connect WhatsApp (Cloud API & WhatsApp Web)',
    titleBn: 'হোয়াটসঅ্যাপ কীভাবে কানেক্ট করবেন (Cloud API ও Web QR)',
    category: 'getting-started',
    tags: ['whatsapp', 'baileys', 'cloud api', 'qr code', 'কানেক্ট', 'হোয়াটসঅ্যাপ'],
    excerptEn: 'Learn how to link WhatsApp Cloud API or scan QR code via WhatsApp Web Baileys engine.',
    excerptBn: 'কীভাবে ওয়াটসঅ্যাপ ক্লাউড এপিআই অথবা কিউআর কোড স্ক্যান করে ZiniChat-এ ওয়াটসঅ্যাপ কানেক্ট করবেন।',
    planConditions: 'Available on all plans. Supports both Meta Cloud API and Baileys Web multi-device.',
    aiCreditCost: '0 AI Credits charged for channel connection.',
    contentEn: `
### Overview
ZiniChat supports dual WhatsApp connection modes: **WhatsApp Cloud API** (Official Meta BSP) and **WhatsApp Web Baileys Engine** (QR Code multi-device scanning).

### Step-by-Step Guide
1. Go to **Settings > Connected Inboxes** and click **+ Connect New Inbox**.
2. Choose **WhatsApp** as your channel type.
3. Select your preferred mode:
   * **QR Code Scan (WhatsApp Web)**: Click "Generate QR Code" and scan the displayed QR code using your WhatsApp Mobile App (Linked Devices).
   * **Meta Cloud API**: Enter your Phone Number ID and System Access Token.
4. Once connected, incoming WhatsApp messages will instantly show up in Live Inbox.

![Connect WhatsApp](/docs/connect-channel.svg)

### Connection Stability Tips
* Keep your mobile WhatsApp application connected to the internet for Web Baileys sessions.
* ZiniChat automatically maintains session keep-alives and reconnects cleanly if interrupted.
`,
    contentBn: `
### সাধারণ ধারণা
ZiniChat-এ দুটি উপায়ে হোয়াটসঅ্যাপ কানেক্ট করা যায়: **WhatsApp Cloud API** এবং **WhatsApp Web Baileys QR Code**।

### কীভাবে কানেক্ট করবেন (Step-by-Step)
১. **Settings > Connected Inboxes**-এ গিয়ে **+ Connect New Inbox**-এ ক্লিক করুন।
২. **WhatsApp** অপশনটি বেছে নিন।
৩. কানেকশন মোড সিলেক্ট করুন:
   * **QR Code Scan**: "Generate QR Code" বাটনে ক্লিক করুন এবং আপনার মোবাইল ওয়াটসঅ্যাপের "Linked Devices" অপশন থেকে স্ক্রিনের QR কোডটি স্ক্যান করুন।
   * **Cloud API**: আপনার Phone Number ID এবং Token বসিয়ে সাবমিট করুন।
৪. কানেক্ট হলে ইনস্ট্যান্ট কাস্টমার মেসেজ আপনার ইনবক্সে আসতে শুরু করবে।

![কানেক্ট ওয়াটসঅ্যাপ](/docs/connect-channel.svg)
`
  },
  {
    id: 'website-livechat-widget',
    titleEn: 'How to Embed Live Chat & WhatsApp Widget on Your Website',
    titleBn: 'আপনার ওয়েবসাইটে লাইভ চ্যাট ও ওয়াটসঅ্যাপ উইজেট যুক্ত করার নিয়ম',
    category: 'getting-started',
    tags: ['widget', 'embed', 'live chat', 'website', 'script', 'উইজেট', 'ওয়েবসাইট'],
    excerptEn: 'How to generate 1-click HTML embed scripts for Live Chat and floating WhatsApp widgets.',
    excerptBn: 'কীভাবে ১-ক্লিকে HTML স্ক্রিপ্ট কপি করে আপনার নিজস্ব ওয়েবসাইটে লাইভ চ্যাট উইজেট বসাবেন।',
    planConditions: 'Available on all plans. Custom color, pre-chat lead form, and headers included.',
    aiCreditCost: '0 AI Credits for widget installation.',
    contentEn: `
### Overview
You can embed a floating Live Chat widget or WhatsApp floating button directly onto your external website or eCommerce store (Shopify, WordPress, WooCommerce, custom HTML).

### Step-by-Step Guide
1. Go to **Settings > Connected Inboxes** and click **+ Create Web Widget**.
2. Select **Live Chat Widget** or **WhatsApp Widget**.
3. Customize widget header text, brand color theme, position (bottom-right/left), and optional Pre-Chat Lead Capture Form (Name, Phone, Email).
4. Copy the generated single-line script tag and paste it inside the HTML body tag of your website.

![Web Widget Integration](/docs/website-widget-guide.svg)

### Features
* Real-time HTTP long polling & Socket auto-reconnect.
* Full mobile responsiveness with zero viewport horizontal scroll overflow.
`,
    contentBn: `
### সাধারণ ধারণা
আপনার ওয়েবসাইট বা ই-কমার্স স্টোরে (WordPress, Shopify, custom HTML) খুব সহজেই একটি ভাসমান লাইভ চ্যাট অথবা ওয়াটসঅ্যাপ বাটন যুক্ত করতে পারবেন।

### কীভাবে উইজেট বসাবেন
১. **Settings > Connected Inboxes**-এ গিয়ে **+ Create Web Widget**-এ ক্লিক করুন।
২. **Live Chat** বা **WhatsApp Widget** পছন্দমত সিলেক্ট করুন।
৩. ব্র্যান্ড কালার, হেডার টেক্সট এবং প্রি-চ্যাট লিড ফর্ম (নাম, ফোন, ইমেইল) কনফিগার করুন।
৪. জেনারেট হওয়া স্ক্রিপ্ট কোডটি কপি করে আপনার ওয়েবসাইটের এইচটিএমএল বডি ট্যাগের মধ্যে পেস্ট করুন।

![ওয়েবসাইট উইজেট সেটআপ](/docs/website-widget-guide.svg)
`
  },

  /* ---------------- AI TRAINING ---------------- */
  {
    id: 'ai-training-basics',
    titleEn: 'How to Train Your AI Assistant (Persona & System Prompt)',
    titleBn: 'কীভাবে আপনার এআই অ্যাসিস্ট্যান্টকে ট্রেইন করবেন (Persona & Q&A)',
    category: 'ai-training',
    tags: ['ai', 'training', 'persona', 'qna', 'auto-reply', 'এআই', 'ট্রেইনিং'],
    excerptEn: 'Learn how to set up your AI persona and add custom Q&As to automate customer replies accurately.',
    excerptBn: 'আপনার এআই-এর পারসোনা কীভাবে সেট করবেন এবং প্রশ্ন-উত্তর যুক্ত করে মেসেজ অটোমেট করবেন তা জানুন।',
    planConditions: 'Available on all plans (Free, Starter, Growth, Scale).',
    aiCreditCost: '0 Credits for saving training data. 1 Credit deducted per automated AI reply in the inbox.',
    contentEn: `
### Overview
The AI Assistant needs to understand your business voice and rules to reply accurately to customer inquiries. You train it using a **System Persona** and **Quick Q&As**.

### Step-by-Step Guide
1. Navigate to **Settings > AI Training** from the left sidebar.
2. Under **Persona / System Prompt**, write a clear description of your business, tone (e.g. polite, formal, sales-focused), and greeting rules.
3. Under **Quick Q&A Knowledge Base**, click **+ Add Q&A** to input frequently asked customer questions alongside your exact answers.
4. Click **Save AI Settings**.

![AI Training Setup](/docs/ai-training-setup.svg)

### Pro Tips
* Be specific about policies (delivery time, return policy, payment options).
* The AI automatically reads products added in your Catalog, so you don't need to manually type item prices in Q&A!
`,
    contentBn: `
### সাধারণ ধারণা
এআই অ্যাসিস্ট্যান্টকে আপনার বিজনেস ও ব্র্যান্ডের নিয়ম শেখাতে **System Persona** এবং **Quick Q&A** ব্যবহার করুন।

### কীভাবে ব্যবহার করবেন (Step-by-Step)
১. সাইডবার থেকে **Settings > AI Training** পেজে যান।
২. **Persona / System Prompt** সেকশনে আপনার ব্যবসার বিবরণ এবং এআই কীভাবে কথা বলবে তা লিখুন।
৩. **Quick Q&A** সেকশনে গ্রাহকদের সচরাচর করা প্রশ্ন ও সঠিক উত্তর যোগ করুন।
৪. **Save AI Settings** বাটনে ক্লিক করুন।

![এআই ট্রেইনিং সেটআপ](/docs/ai-training-setup.svg)
`
  },
  {
    id: 'ai-simulator-testing',
    titleEn: 'How to Test Your AI Persona using the Live Simulator',
    titleBn: 'লাইভ সিমুলেটর ব্যবহার করে কীভাবে এআই টেস্ট করবেন',
    category: 'ai-training',
    tags: ['simulator', 'test', 'ai training', 'prompt', 'সিমুলেটর', 'টেস্ট'],
    excerptEn: 'Use the built-in AI Simulator agent to test customer conversations before turning on live inbox auto-replies.',
    excerptBn: 'ইনবক্সে অটো-রিপ্লাই চালু করার আগে লাইভ সিমুলেটরে কাস্টমার হিসেবে কথা বলে এআই টেস্ট করুন।',
    planConditions: 'Available on all plans.',
    aiCreditCost: 'Uses 1 AI Credit per simulator response.',
    contentEn: `
### Overview
Before enabling live AI auto-replies on customer channels, you can test how your AI responds to complex questions using the interactive **AI Simulator**.

### Step-by-Step Guide
1. Go to **Settings > AI Training**.
2. Scroll to the **AI Live Simulator** section on the right side.
3. Type test customer questions in Bengali or English (e.g., "প্রোডাক্টের দাম কত?", "Delivery policy?").
4. Inspect how the AI references catalog items, Q&As, and your system persona in real time.

![AI Simulator Guide](/docs/ai-training-setup.svg)
`,
    contentBn: `
### সাধারণ ধারণা
গ্রাহকদের সাথে সরাসরি এআই চ্যাট চালু করার আগে আপনি **AI Live Simulator** দিয়ে কাস্টমার সেজে কথা বলে এআই-এর পারফরম্যান্স যাচাই করতে পারবেন।

### কীভাবে টেস্ট করবেন
১. **Settings > AI Training** পেজে যান।
২. ডানদিকের **AI Live Simulator** সেকশনে টেস্ট প্রশ্ন লিখুন।
৩. এআই কীভাবে প্রডাক্ট ক্যাটালগ ও প্রশ্ন-উত্তর ব্যবহার করে উত্তর দিচ্ছে তা দেখুন।

![এআই সিমুলেটর গাইড](/docs/ai-training-setup.svg)
`
  },

  /* ---------------- INBOX & MESSAGING ---------------- */
  {
    id: 'live-inbox-navigation',
    titleEn: 'Navigating the Omnichannel Live Inbox & Channel Filters',
    titleBn: 'লাইভ ইনবক্স ও চ্যানেল ফিল্টারিং গাইড',
    category: 'inbox-messaging',
    tags: ['inbox', 'live inbox', 'filter', 'channels', 'messages', 'ইনবক্স', 'মেসেজিং'],
    excerptEn: 'Manage all customer conversations across WhatsApp, Messenger, Instagram, and Live Chat from one inbox.',
    excerptBn: 'একটি মাত্র ইনবক্স থেকে আপনার সব চ্যানেল (ওয়াটসঅ্যাপ, ফেসবুক, ইনস্টাগ্রাম) ম্যানেজ করুন।',
    planConditions: 'Available on all plans.',
    aiCreditCost: 'Viewing messages is 100% Free. 1 AI Credit per automated AI reply.',
    contentEn: `
### Overview
The Live Inbox aggregates all incoming customer interactions. It features real-time Socket.IO synchronization, instant channel filtering, and manual human takeover controls.

### Key Features
* **Channel Filter Tabs**: Easily filter messages by All, WhatsApp, Facebook Messenger, Instagram DM, or Live Chat.
* **AI Toggle**: Switch AI auto-reply ON or OFF for any individual customer thread.
* **Order Creation**: Click **+ Create Order** directly inside the conversation sidebar to log customer sales.

![Live Inbox Guide](/docs/inbox-messaging-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
লাইভ ইনবক্স পেজ থেকে আপনার সব কাস্টমারের সাথে রিয়েল-টাইমে কথা বলতে ও মেসেজ সামলাতে পারবেন।

### প্রধান ফিচারসমূহ
* **চ্যানেল ফিল্টার ফিল্ড**: All, WhatsApp, Messenger, Instagram বা Live Chat অনুযায়ী মেসেজ ফিল্টার করুন।
* **এআই সুইচ (AI Toggle)**: নির্দিষ্ট কোনো কাস্টমারের জন্য প্রয়োজনে এআই অটো-রিপ্লাই অন বা অফ করুন।
* **ইনবক্স থেকেই অর্ডার তৈরি**: ডানদিকের সাইডবার থেকে সরাসরি কাস্টমারের অর্ডার প্লেস করুন।

![লাইভ ইনবক্স গাইড](/docs/inbox-messaging-guide.svg)
`
  },
  {
    id: 'broadcast-campaigns',
    titleEn: 'Sending Segmented Customer Broadcast Campaigns',
    titleBn: 'কাস্টমারদের সেগমেন্টেড ব্রডকাস্ট ক্যাম্পেইন পাঠানোর নিয়ম',
    category: 'inbox-messaging',
    tags: ['broadcast', 'campaign', 'bulk message', 'marketing', 'ব্রডকাস্ট', 'ক্যাম্পেইন'],
    excerptEn: 'Send promotional updates and announcements to segmented contact lists via WhatsApp and messaging channels.',
    excerptBn: 'আপনার টার্গেটেড কাস্টমার লিস্টে এক ক্লিকে প্রোমোশনাল ব্রডকাস্ট মেসেজ বা অফার পাঠান।',
    planConditions: 'Available on Growth and Scale plans.',
    aiCreditCost: '0 AI Credits. Consumes outbound message quota.',
    contentEn: `
### Overview
Broadcast Campaigns allow merchants to execute targeted messaging campaigns for marketing offers, festive discounts, or re-engagement updates.

### Step-by-Step Guide
1. Go to **AUTOMATION > Broadcasts** from the left navigation menu.
2. Click **+ New Campaign**.
3. Select target contact tags, select the connected channel, write your message template, and click **Send Broadcast**.

![Broadcast Guide](/docs/inbox-messaging-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
ব্রডকাস্ট ফিচার দিয়ে আপনার স্টোরের অফার, ডিসকাউন্ট বা আপডেট হাজার হাজার কাস্টমারের কাছে একসাথে মেসেজ আকারে পাঠাতে পারবেন।

### কীভাবে ব্রডকাস্ট পাঠাবেন
১. বামদিকের মেনু থেকে **AUTOMATION > Broadcasts**-এ যান।
২. **+ New Campaign** বাটনে ক্লিক করুন।
৩. মেসেজ টেমপ্লেট ও চ্যানেল বেছে নিয়ে **Send Broadcast** করুন।

![ব্রডকাস্ট গাইড](/docs/inbox-messaging-guide.svg)
`
  },

  /* ---------------- SALES & E-COMMERCE ---------------- */
  {
    id: 'order-inquiry-management',
    titleEn: 'Managing Products Catalog & Multi-Vertical Booking Orders',
    titleBn: 'প্রোডাক্ট ক্যাটালগ এবং অর্ডার/ইনকোয়ারি ম্যানেজমেন্ট',
    category: 'sales-ecommerce',
    tags: ['products', 'catalog', 'orders', 'verticals', 'ecommerce', 'প্রোডাক্ট', 'অর্ডার'],
    excerptEn: 'Add products, set custom attributes across 8 vertical business modes, and manage customer orders.',
    excerptBn: 'ক্যাটালগে প্রোডাক্ট যুক্ত করুন এবং ৮টি ভিন্ন বিজনেস ভার্টিক্যালের অর্ডার ও ইনকোয়ারি পরিচালনা করুন।',
    planConditions: 'Available on all plans.',
    aiCreditCost: '0 AI Credits for product catalog storage.',
    contentEn: `
### Overview
ZiniChat adapts dynamically to **8 Business Verticals** (Retail, Real Estate, Hospitality, Software, Financial Services, Healthcare, Education, Logistics).

### Step-by-Step Guide
1. Go to **Catalog > Products** from sidebar.
2. Click **+ Add Product** and enter product name, price (or leave blank for "Price on Call"), stock quantity, images, and custom attributes.
3. The AI instantly syncs this catalog to answer customer pricing and availability questions!

![Sales Orders Guide](/docs/sales-orders-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
ZiniChat রিয়েল এস্টেট, সফটওয়্যার, ই-কমার্স সহ ৮টি ভিন্ন ধরণের বিজনেসের সাথে খাপ খাইয়ে প্রোডাক্ট ক্যাটালগ পরিচালনা করে।

### কীভাবে প্রোডাক্ট যোগ করবেন
১. সাইডবার থেকে **Catalog > Products**-এ যান।
২. **+ Add Product** বাটনে ক্লিক করে নাম, ছবি, স্টক ও দাম (অথবা আলোচনা সাপেক্ষে) সেট করুন।
৩. এআই সাথে সাথে ক্যাটালগের সব তথ্য পড়তে পারবে এবং গ্রাহকদের সঠিক দাম জানাবে!

![সেলস ও ক্যাটালগ গাইড](/docs/sales-orders-guide.svg)
`
  },
  {
    id: 'crm-leads-kanban',
    titleEn: 'CRM Leads Management & Multi-Vertical Kanban Pipeline',
    titleBn: 'সিআরএম লিড ও কানবান পাইপলাইন ম্যানেজমেন্ট',
    category: 'sales-ecommerce',
    tags: ['crm', 'leads', 'kanban', 'pipeline', 'deals', 'লিড', 'কানবান'],
    excerptEn: 'Track customer lead stages from initial inquiry to deal closed using the interactive Kanban board.',
    excerptBn: 'ইনকোয়ারি থেকে শুরু করে ডিল কনফার্ম হওয়া পর্যন্ত সব কাস্টমারকে কানবান বোর্ডে ট্র্যাক করুন।',
    planConditions: 'Available on all plans.',
    aiCreditCost: '0 AI Credits.',
    contentEn: `
### Overview
The CRM Leads module provides a visual Kanban pipeline. Incoming customer demo requests or order inquiries automatically populate into the pipeline.

### Features
* **Auto Stage Progression**: When AI receives order/demo requests, it automatically moves the lead card to the corresponding stage.
* **Drag-and-Drop**: Drag leads across stages (New Inquiry -> In Discussion -> Closed Won).

![Leads Kanban Guide](/docs/leads-kanban-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
সিআরএম লিডস পেজে কাস্টমারদের সাথে হওয়া সকল ডিল এবং ইনকোয়ারি কানবান বোর্ডে দেখতে ও ড্র্যাগ-এন্ড-ড্রপ করে ট্র্যাক করতে পারবেন।

![লিডস কানবান গাইড](/docs/leads-kanban-guide.svg)
`
  },

  /* ---------------- BILLING & QUOTAS ---------------- */
  {
    id: 'billing-plans-quotas',
    titleEn: 'Understanding Subscription Plans, Quotas & Outbound AI Credits',
    titleBn: 'সাবস্ক্রিপশন প্ল্যান, কোটা এবং এআই ক্রেডিট ব্যবহারের নিয়ম',
    category: 'billing-quotas',
    tags: ['billing', 'quota', 'ai credit', 'subscription', 'plans', 'বিলিং', 'কোটা'],
    excerptEn: 'Learn how message quotas, AI credits, and monthly renewal cycles are calculated.',
    excerptBn: 'কীভাবে মেসেজ কোটা, এআই রেসপন্স ক্রেডিট এবং মান্থলি রিনিউয়াল হিসাব করা হয়।',
    planConditions: 'Applies to all plan tiers (Free, Starter, Growth, Scale).',
    aiCreditCost: '1 AI Response Credit per automated inbox response.',
    contentEn: `
### Overview
* **Inbound Customer Messages**: 100% Unlimited & Free.
* **Outbound AI Replies**: 1 AI Credit per automated reply.
* **Monthly Quota Reset**: For yearly subscriptions, quotas refresh every 30 days automatically!

![Billing Guide](/docs/billing-mfs-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
* **ইনকামিং কাস্টমার মেসেজ**: সম্পূর্ণ ফ্রি এবং আনলিমিটেড।
* **আউটবাউন্ড এআই রিপ্লাই**: প্রতিটি অটোমেটিক উত্তরের জন্য ১টি এআই ক্রেডিট কাটা হয়।
* **কোটা রিনিউয়াল**: প্রতি মাসে আপনার নির্দিষ্ট প্ল্যানের মেসেজ ও এআই কোটা রিফ্রেশ হয়ে যায়।

![বিলিং গাইড](/docs/billing-mfs-guide.svg)
`
  },
  {
    id: 'mfs-bangla-qr-payments',
    titleEn: 'Instant bKash, Nagad & Rocket EMVCo Bangla QR Payments',
    titleBn: 'বিকাশ, নগদ ও রকেট দিয়ে ইনস্ট্যান্ট বাংলা কিউআর পেমেন্ট',
    category: 'billing-quotas',
    tags: ['bkash', 'nagad', 'rocket', 'mfs', 'bangla qr', 'payment', 'পেমেন্ট', 'বিকাশ'],
    excerptEn: 'How to upgrade your subscription instantly using bKash / Nagad EMVCo Bangla QR code and TrxID.',
    excerptBn: 'কীভাবে বিকাশ বা নগদ অ্যাপ দিয়ে বাংলা QR স্ক্যান করে অথবা TrxID দিয়ে সাথে সাথে প্ল্যান অ্যাক্টিভ করবেন।',
    planConditions: 'Available for all Bangladeshi BDT merchant accounts.',
    aiCreditCost: '0 AI Credits.',
    contentEn: `
### Overview
ZiniChat supports automated MFS payments via standard EMVCo Bangla QR payloads for bKash, Nagad, and Rocket.

### Step-by-Step Guide
1. Go to **Settings > Subscription** and click **Upgrade Plan**.
2. Select **Pay via bKash / Nagad (MFS)**.
3. Scan the displayed **Bangla QR Code** using your bKash/Nagad app or send money to the official Merchant number.
4. Input your transaction ID (**TrxID**) and click **Submit Payment**. Your plan activates immediately upon validation!

![MFS Payment Guide](/docs/billing-mfs-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
ZiniChat-এ বিকাশ, নগদ ও রকেটের মাধ্যমে খুব সহজেই অটোমেটেড এবং ইনস্ট্যান্ট পেমেন্ট করা যায়।

### কীভাবে পেমেন্ট করবেন
১. **Settings > Subscription**-এ গিয়ে **Upgrade Plan**-এ ক্লিক করুন।
২. **bKash / Nagad (MFS)** সিলেক্ট করুন।
৩. স্ক্রিনে দেখানো **Bangla QR Code**-টি বিকাশ/নগদ অ্যাপ দিয়ে স্ক্যান করুন অথবা মার্চেন্ট নম্বরে পেমেন্ট করুন।
৪. প্রাপ্ত **TrxID** বক্সে বসিয়ে সাবমিট করলেই সাথে সাথে অ্যাকাউন্ট আপগ্রেড হয়ে যাবে!

![এমএফএস পেমেন্ট গাইড](/docs/billing-mfs-guide.svg)
`
  },

  /* ---------------- SETTINGS & TEAM ---------------- */
  {
    id: 'team-permissions-roles',
    titleEn: 'Managing Team Seats & Granular Member Role Permissions',
    titleBn: 'টিম মেম্বার এবং অ্যাক্সেস পারমিশন ম্যানেজমেন্ট',
    category: 'settings',
    tags: ['team', 'roles', 'permissions', 'invite', 'members', 'টিম', 'পারমিশন'],
    excerptEn: 'Invite support agents or managers and customize their exact access rights.',
    excerptBn: 'আপনার টিম মেম্বারদের ইনভাইট করুন এবং তাদের কার কোন কোন ফিচারে অ্যাক্সেস থাকবে তা ঠিক করে দিন।',
    planConditions: 'Team seat quota depends on subscription plan.',
    aiCreditCost: '0 AI Credits.',
    contentEn: `
### Overview
You can delegate customer handling to your sales agents without giving them access to billing, AI prompt modification, or package settings.

### Step-by-Step Guide
1. Go to **SETTINGS > Team** from the left navigation.
2. Click **+ Invite Member**, enter their email, name, and choose a role (Admin, Agent, Manager).
3. Check or uncheck granular permission boxes (Live Inbox, Products Catalog, AI Training, Analytics).

![Team Settings Guide](/docs/settings-team-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
আপনার সেলস বা কাস্টমার সাপোর্ট এজেন্টদের নিজস্ব অ্যাকাউন্ট দিয়ে ইনবক্সে অ্যাক্সেস দিন, যেখানে তারা বিলিং বা সেটিংস পরিবর্তন করতে পারবে না।

### কীভাবে মেম্বার যোগ করবেন
১. সাইডবার থেকে **SETTINGS > Team**-এ যান।
২. **+ Invite Member** বাটনে ক্লিক করে নাম, ইমেইল ও রোল সিলেক্ট করুন।
৩. কোন কোন ফিচারে অ্যাক্সেস থাকবে তা পারমিশন বক্স চেক/আনচেক করে **Save** করুন।

![টিম সেটিংস গাইড](/docs/settings-team-guide.svg)
`
  },
  {
    id: 'storage-channel-renaming',
    titleEn: 'Managing VPS Storage Limits & Renaming Connected Channels',
    titleBn: 'স্টোরেজ লিমিট এবং কানেক্টেড ইনবক্সের নাম পরিবর্তন',
    category: 'settings',
    tags: ['storage', 'rename', 'channel', 'settings', 'disk', 'স্টোরেজ', 'ইনবক্স'],
    excerptEn: 'How storage quotas work, disk reclamation on conversation delete, and channel renaming.',
    excerptBn: 'স্টোরেজ কোটা কীভাবে কাজ করে এবং ইনবক্সের চ্যানেলের নাম যেভাবে নিজের মতো পরিবর্তন করবেন।',
    planConditions: 'Available on all plans.',
    aiCreditCost: '0 AI Credits.',
    contentEn: `
### Overview
* **Channel Renaming**: Navigate to **Settings > Connected Inboxes**, click the Pencil icon next to any Facebook Page, Instagram, WhatsApp, or Website Widget, type a friendly nickname, and press Enter to save.
* **Storage Reclamation**: When you hard-delete a conversation, ZiniChat automatically purges linked image/audio files from VPS disk storage, freeing up your tenant storage quota!

![Storage Settings Guide](/docs/settings-team-guide.svg)
`,
    contentBn: `
### সাধারণ ধারণা
* **চ্যানেল রিনেইম (Rename)**: **Settings > Connected Inboxes**-এ গিয়ে যেকোনো চ্যানেলের পাশের পেন্সিল আইকনে ক্লিক করে নিজের পছন্দমতো নাম সেট করতে পারবেন।
* **স্টোরেজ রিক্লেমেশন**: লাইভ ইনবক্স থেকে কোনো চ্যাট ডিলিট করলে তার মিডিয়া ফাইলগুলো সার্ভার থেকে সম্পূর্ণ মুছে ফেলা হয় এবং আপনার অ্যাকাউন্টের স্টোরেজ ফাকা হয়ে যায়।

![স্টোরেজ সেটিংস গাইড](/docs/settings-team-guide.svg)
`
  }
];
