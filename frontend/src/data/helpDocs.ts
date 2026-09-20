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
  { id: 'getting-started', labelEn: 'Getting Started', labelBn: 'Getting Started', icon: 'Rocket' },
  { id: 'ai-training', labelEn: 'AI Training', labelBn: 'AI Training', icon: 'Bot' },
  { id: 'inbox-messaging', labelEn: 'Inbox & Messaging', labelBn: 'Inbox & Messaging', icon: 'MessageSquare' },
  { id: 'sales-ecommerce', labelEn: 'Sales & E-Commerce', labelBn: 'Sales & E-Commerce', icon: 'ShoppingBag' },
  { id: 'billing-quotas', labelEn: 'Billing & Quotas', labelBn: 'Billing & Quotas', icon: 'CreditCard' },
  { id: 'settings', labelEn: 'Settings & Team', labelBn: 'Settings & Team', icon: 'Settings' }
];

export const helpDocs: HelpArticle[] = [
  /* ---------------- GETTING STARTED ---------------- */
  {
    id: 'connect-facebook-page',
    titleEn: 'How to Connect Facebook Page & Instagram DM',
    titleBn: 'How to Connect Facebook Page & Instagram DM',
    category: 'getting-started',
    tags: ['facebook', 'instagram', 'connect', 'page', 'messenger', 'meta'],
    excerptEn: 'Step-by-step guide to connecting your Meta Messenger and Instagram DM channels to ZiniChat via Official Meta Graph API.',
    excerptBn: 'Step-by-step guide to connecting your Meta Messenger and Instagram DM channels to ZiniChat via Official Meta Graph API.',
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
`
  },
  {
    id: 'connect-whatsapp-baileys',
    titleEn: 'How to Connect WhatsApp (Cloud API & WhatsApp Web)',
    titleBn: 'How to Connect WhatsApp (Cloud API & WhatsApp Web)',
    category: 'getting-started',
    tags: ['whatsapp', 'baileys', 'cloud api', 'qr code', 'connect'],
    excerptEn: 'Learn how to link WhatsApp Cloud API or scan QR code via WhatsApp Web Baileys engine.',
    excerptBn: 'Learn how to link WhatsApp Cloud API or scan QR code via WhatsApp Web Baileys engine.',
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
`
  },
  {
    id: 'website-livechat-widget',
    titleEn: 'How to Embed Live Chat & WhatsApp Widget on Your Website',
    titleBn: 'How to Embed Live Chat & WhatsApp Widget on Your Website',
    category: 'getting-started',
    tags: ['widget', 'embed', 'live chat', 'website', 'script'],
    excerptEn: 'How to generate 1-click HTML embed scripts for Live Chat and floating WhatsApp widgets.',
    excerptBn: 'How to generate 1-click HTML embed scripts for Live Chat and floating WhatsApp widgets.',
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
### Overview
You can embed a floating Live Chat widget or WhatsApp floating button directly onto your external website or eCommerce store (Shopify, WordPress, WooCommerce, custom HTML).

### Step-by-Step Guide
1. Go to **Settings > Connected Inboxes** and click **+ Create Web Widget**.
2. Select **Live Chat Widget** or **WhatsApp Widget**.
3. Customize widget header text, brand color theme, position (bottom-right/left), and optional Pre-Chat Lead Capture Form (Name, Phone, Email).
4. Copy the generated script code and paste it inside the HTML body tag of your website.

![Web Widget Setup](/docs/website-widget-guide.svg)
`
  },

  /* ---------------- AI TRAINING ---------------- */
  {
    id: 'ai-training-basics',
    titleEn: 'How to Train Your AI Assistant (Persona & System Prompt)',
    titleBn: 'How to Train Your AI Assistant (Persona & System Prompt)',
    category: 'ai-training',
    tags: ['ai', 'training', 'persona', 'qna', 'auto-reply'],
    excerptEn: 'Learn how to set up your AI persona and add custom Q&As to automate customer replies accurately.',
    excerptBn: 'Learn how to set up your AI persona and add custom Q&As to automate customer replies accurately.',
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
### Overview
The AI Assistant needs to understand your business voice and rules to reply accurately to customer inquiries. You train it using a **System Persona** and **Quick Q&As**.

### Step-by-Step Guide
1. Navigate to **Settings > AI Training** from the left sidebar.
2. Under **Persona / System Prompt**, write a clear description of your business, tone, and greeting rules.
3. Under **Quick Q&A Knowledge Base**, click **+ Add Q&A** to input frequently asked questions and answers.
4. Click **Save AI Settings**.

![AI Training Setup](/docs/ai-training-setup.svg)
`
  },
  {
    id: 'ai-simulator-testing',
    titleEn: 'How to Test Your AI Persona using the Live Simulator',
    titleBn: 'How to Test Your AI Persona using the Live Simulator',
    category: 'ai-training',
    tags: ['simulator', 'test', 'ai training', 'prompt'],
    excerptEn: 'Use the built-in AI Simulator agent to test customer conversations before turning on live inbox auto-replies.',
    excerptBn: 'Use the built-in AI Simulator agent to test customer conversations before turning on live inbox auto-replies.',
    planConditions: 'Available on all plans.',
    aiCreditCost: 'Uses 1 AI Credit per simulator response.',
    contentEn: `
### Overview
Before enabling live AI auto-replies on customer channels, you can test how your AI responds to complex questions using the interactive **AI Simulator**.

### Step-by-Step Guide
1. Go to **Settings > AI Training**.
2. Scroll to the **AI Live Simulator** section on the right side.
3. Type test customer questions in English (e.g., "What is the product price?", "What is your return policy?").
4. Inspect how the AI references catalog items, Q&As, and your system persona in real time.

![AI Simulator Guide](/docs/ai-training-setup.svg)
`,
    contentBn: `
### Overview
Before enabling live AI auto-replies on customer channels, you can test how your AI responds to complex questions using the interactive **AI Simulator**.

### Step-by-Step Guide
1. Go to **Settings > AI Training**.
2. Scroll to the **AI Live Simulator** section on the right side.
3. Type test customer questions in English.
4. Inspect how the AI references catalog items, Q&As, and your system persona in real time.

![AI Simulator Guide](/docs/ai-training-setup.svg)
`
  },

  /* ---------------- INBOX & MESSAGING ---------------- */
  {
    id: 'live-inbox-navigation',
    titleEn: 'Navigating the Omnichannel Live Inbox & Channel Filters',
    titleBn: 'Navigating the Omnichannel Live Inbox & Channel Filters',
    category: 'inbox-messaging',
    tags: ['inbox', 'live inbox', 'filter', 'channels', 'messages'],
    excerptEn: 'Manage all customer conversations across WhatsApp, Messenger, Instagram, and Live Chat from one inbox.',
    excerptBn: 'Manage all customer conversations across WhatsApp, Messenger, Instagram, and Live Chat from one inbox.',
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
### Overview
The Live Inbox aggregates all incoming customer interactions. It features real-time Socket.IO synchronization, instant channel filtering, and manual human takeover controls.

### Key Features
* **Channel Filter Tabs**: Easily filter messages by All, WhatsApp, Facebook Messenger, Instagram DM, or Live Chat.
* **AI Toggle**: Switch AI auto-reply ON or OFF for any individual customer thread.
* **Order Creation**: Click **+ Create Order** directly inside the conversation sidebar to log customer sales.

![Live Inbox Guide](/docs/inbox-messaging-guide.svg)
`
  },
  {
    id: 'broadcast-campaigns',
    titleEn: 'Sending Segmented Customer Broadcast Campaigns',
    titleBn: 'Sending Segmented Customer Broadcast Campaigns',
    category: 'inbox-messaging',
    tags: ['broadcast', 'campaign', 'bulk message', 'marketing'],
    excerptEn: 'Send promotional updates and announcements to segmented contact lists via WhatsApp and messaging channels.',
    excerptBn: 'Send promotional updates and announcements to segmented contact lists via WhatsApp and messaging channels.',
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
### Overview
Broadcast Campaigns allow merchants to execute targeted messaging campaigns for marketing offers, festive discounts, or re-engagement updates.

### Step-by-Step Guide
1. Go to **AUTOMATION > Broadcasts** from the left navigation menu.
2. Click **+ New Campaign**.
3. Select target contact tags, select the connected channel, write your message template, and click **Send Broadcast**.

![Broadcast Guide](/docs/inbox-messaging-guide.svg)
`
  },

  /* ---------------- SALES & E-COMMERCE ---------------- */
  {
    id: 'order-inquiry-management',
    titleEn: 'Managing Products Catalog & Multi-Vertical Booking Orders',
    titleBn: 'Managing Products Catalog & Multi-Vertical Booking Orders',
    category: 'sales-ecommerce',
    tags: ['products', 'catalog', 'orders', 'verticals', 'ecommerce'],
    excerptEn: 'Add products, set custom attributes across 8 vertical business modes, and manage customer orders.',
    excerptBn: 'Add products, set custom attributes across 8 vertical business modes, and manage customer orders.',
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
### Overview
ZiniChat adapts dynamically to **8 Business Verticals** (Retail, Real Estate, Hospitality, Software, Financial Services, Healthcare, Education, Logistics).

### Step-by-Step Guide
1. Go to **Catalog > Products** from sidebar.
2. Click **+ Add Product** and enter product name, price (or leave blank for "Price on Call"), stock quantity, images, and custom attributes.
3. The AI instantly syncs this catalog to answer customer pricing and availability questions!

![Sales Orders Guide](/docs/sales-orders-guide.svg)
`
  },
  {
    id: 'crm-leads-kanban',
    titleEn: 'CRM Leads Management & Multi-Vertical Kanban Pipeline',
    titleBn: 'CRM Leads Management & Multi-Vertical Kanban Pipeline',
    category: 'sales-ecommerce',
    tags: ['crm', 'leads', 'kanban', 'pipeline', 'deals'],
    excerptEn: 'Track customer lead stages from initial inquiry to deal closed using the interactive Kanban board.',
    excerptBn: 'Track customer lead stages from initial inquiry to deal closed using the interactive Kanban board.',
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
### Overview
The CRM Leads module provides a visual Kanban pipeline. Incoming customer demo requests or order inquiries automatically populate into the pipeline.

### Features
* **Auto Stage Progression**: When AI receives order/demo requests, it automatically moves the lead card to the corresponding stage.
* **Drag-and-Drop**: Drag leads across stages (New Inquiry -> In Discussion -> Closed Won).

![Leads Kanban Guide](/docs/leads-kanban-guide.svg)
`
  },

  /* ---------------- BILLING & QUOTAS ---------------- */
  {
    id: 'billing-plans-quotas',
    titleEn: 'Understanding Subscription Plans, Quotas & Outbound AI Credits',
    titleBn: 'Understanding Subscription Plans, Quotas & Outbound AI Credits',
    category: 'billing-quotas',
    tags: ['billing', 'quota', 'ai credit', 'subscription', 'plans'],
    excerptEn: 'Learn how message quotas, AI credits, and monthly renewal cycles are calculated.',
    excerptBn: 'Learn how message quotas, AI credits, and monthly renewal cycles are calculated.',
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
### Overview
* **Inbound Customer Messages**: 100% Unlimited & Free.
* **Outbound AI Replies**: 1 AI Credit per automated reply.
* **Monthly Quota Reset**: For yearly subscriptions, quotas refresh every 30 days automatically!

![Billing Guide](/docs/billing-mfs-guide.svg)
`
  },
  {
    id: 'mfs-bangla-qr-payments',
    titleEn: 'Instant bKash, Nagad & Rocket EMVCo Bangla QR Payments',
    titleBn: 'Instant bKash, Nagad & Rocket EMVCo Bangla QR Payments',
    category: 'billing-quotas',
    tags: ['bkash', 'nagad', 'rocket', 'mfs', 'bangla qr', 'payment'],
    excerptEn: 'How to upgrade your subscription instantly using bKash / Nagad EMVCo Bangla QR code and TrxID.',
    excerptBn: 'How to upgrade your subscription instantly using bKash / Nagad EMVCo Bangla QR code and TrxID.',
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
### Overview
ZiniChat supports automated MFS payments via standard EMVCo Bangla QR payloads for bKash, Nagad, and Rocket.

### Step-by-Step Guide
1. Go to **Settings > Subscription** and click **Upgrade Plan**.
2. Select **Pay via bKash / Nagad (MFS)**.
3. Scan the displayed **Bangla QR Code** using your bKash/Nagad app or send money to the official Merchant number.
4. Input your transaction ID (**TrxID**) and click **Submit Payment**. Your plan activates immediately upon validation!

![MFS Payment Guide](/docs/billing-mfs-guide.svg)
`
  },

  /* ---------------- SETTINGS & TEAM ---------------- */
  {
    id: 'team-permissions-roles',
    titleEn: 'Managing Team Seats & Granular Member Role Permissions',
    titleBn: 'Managing Team Seats & Granular Member Role Permissions',
    category: 'settings',
    tags: ['team', 'roles', 'permissions', 'invite', 'members'],
    excerptEn: 'Invite support agents or managers and customize their exact access rights.',
    excerptBn: 'Invite support agents or managers and customize their exact access rights.',
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
### Overview
You can delegate customer handling to your sales agents without giving them access to billing, AI prompt modification, or package settings.

### Step-by-Step Guide
1. Go to **SETTINGS > Team** from the left navigation.
2. Click **+ Invite Member**, enter their email, name, and choose a role (Admin, Agent, Manager).
3. Check or uncheck granular permission boxes (Live Inbox, Products Catalog, AI Training, Analytics).

![Team Settings Guide](/docs/settings-team-guide.svg)
`
  },
  {
    id: 'storage-channel-renaming',
    titleEn: 'Managing VPS Storage Limits & Renaming Connected Channels',
    titleBn: 'Managing VPS Storage Limits & Renaming Connected Channels',
    category: 'settings',
    tags: ['storage', 'rename', 'channel', 'settings', 'disk'],
    excerptEn: 'How storage quotas work, disk reclamation on conversation delete, and channel renaming.',
    excerptBn: 'How storage quotas work, disk reclamation on conversation delete, and channel renaming.',
    planConditions: 'Available on all plans.',
    aiCreditCost: '0 AI Credits.',
    contentEn: `
### Overview
* **Channel Renaming**: Navigate to **Settings > Connected Inboxes**, click the Pencil icon next to any Facebook Page, Instagram, WhatsApp, or Website Widget, type a friendly nickname, and press Enter to save.
* **Storage Reclamation**: When you hard-delete a conversation, ZiniChat automatically purges linked image/audio files from VPS disk storage, freeing up your tenant storage quota!

![Storage Settings Guide](/docs/settings-team-guide.svg)
`,
    contentBn: `
### Overview
* **Channel Renaming**: Navigate to **Settings > Connected Inboxes**, click the Pencil icon next to any Facebook Page, Instagram, WhatsApp, or Website Widget, type a friendly nickname, and press Enter to save.
* **Storage Reclamation**: When you hard-delete a conversation, ZiniChat automatically purges linked image/audio files from VPS disk storage, freeing up your tenant storage quota!

![Storage Settings Guide](/docs/settings-team-guide.svg)
`
  }
];
