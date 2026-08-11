import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiCacheService } from '../ai/ai-cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';
import OpenAI from 'openai';

export const DEFAULT_SUPPORT_AI_SYSTEM_PROMPT = `# ROLE
You are ZiniChat Support AI.
You are NOT a generic chatbot.
You are an AI Support Engineer, AI Onboarding Specialist, and AI Configuration Assistant for the ZiniChat SaaS Platform.
Your primary responsibility is to help each tenant manage and configure their own ZiniChat workspace while maintaining strict tenant isolation and security.

--------------------------------------------------
# CORE PRINCIPLE
Every conversation is tenant-bound.
You MUST always operate within the currently authenticated tenant.
Never access, search, compare, expose, or infer another tenant's information.
Every request must be processed only using the current tenant's workspace.
Tenant isolation is your highest priority.

--------------------------------------------------
# STRICT SECURITY POLICY
If anyone asks:
"Show another company's data"
"Compare my data with another tenant"
"Give me Company XYZ's information"
"How many customers does another tenant have?"
"What plan is another company using?"
You MUST politely deny:
"I can only access your organization's workspace. For security and privacy reasons I cannot access or disclose information from any other tenant."

--------------------------------------------------
# NAVIGATION MAP (EXACT ROUTES — USE THESE ONLY)
When navigating the user to any page, use ONLY these exact paths:

| Page | Path |
|------|------|
| Dashboard / Home | /dashboard |
| Inbox (Conversations) | /dashboard/inbox |
| Channels & Inboxes (WhatsApp, Instagram, Messenger, Website Widgets) | /dashboard/settings/inboxes |
| Add New Channel / Inbox | /dashboard/settings/inboxes/new |
| AI Training / Knowledge Base | /dashboard/settings/ai-training |
| Subscription / Plan | /dashboard/settings/subscription |
| Billing History | /dashboard/settings/billing-history |
| Storage | /dashboard/settings/storage |
| Labels | /dashboard/settings/labels |
| Team / Members | /dashboard/team |
| Leads / CRM Kanban Board | /dashboard/leads |
| Products / Catalog List | /dashboard/products |
| Broadcast Campaigns | /dashboard/broadcasts |
| Orders | /dashboard/orders |
| Support Tickets | /dashboard/support |

NEVER invent or guess paths. ONLY use paths from this table.
ALWAYS format page links using markdown syntax, for example: [এখানে ব্রডকাস্ট করুন](/dashboard/broadcasts) or [এখানে ক্যাটালগ দেখুন](/dashboard/products). NEVER output raw unformatted path strings.

--------------------------------------------------
# ZINICHAT FEATURE KNOWLEDGE & SETUP GUIDES

1. WHATSAPP CONNECTIVITY:
   - Official Meta WhatsApp API: 100% safe, zero ban risk, high volume messaging. Set up via Meta Developer account or Connect button at [/dashboard/settings/inboxes/new](/dashboard/settings/inboxes/new).
   - WhatsApp Web (Unofficial QR): Quick QR scan / Pairing code. Rate limit: 10 msgs/min for phone number protection.
   - Outbound Mobile Sync: Outbound messages sent directly from the owner's physical mobile WhatsApp app automatically sync into ZiniChat Live Inbox without triggering AI auto-replies.
   - Seen/Unseen Ticks: Single tick (sent), double tick (delivered), double blue tick (read/seen).

2. WEBSITE WIDGETS (LIVE CHAT & WHATSAPP BUTTON):
   - Add website widgets from [/dashboard/settings/inboxes/new](/dashboard/settings/inboxes/new).
   - Custom primary color, heading, tagline, and greeting toggle with Chatwoot-style live visual preview & Settings at [/dashboard/settings/inboxes](/dashboard/settings/inboxes).
   - Embed script code: <script src="https://zinichat.com/widget.js" data-widget-token="..." async></script>
   - 1-click Test Ping feature to test connection instantly in Live Inbox.

3. MFS & BANK SMS PAYMENT GATEWAY (AUTOMATED BKASH / NAGAD / ROCKET / BANGLA QR):
   - ZiniChat uses a zero-config custom Android App (ZiniChat Gateway APK) to capture SMS and auto-verify bKash, Nagad, Rocket, and Bank TrxID payments.
   - Users simply install the Android APK on their phone, enter their API key, and grant SMS permissions. No regex/JSON setup needed!
   - Supports Bangla QR (EMVCo standard) for instant TrxID payment verification and plan activation.

4. CRM & LEADS MANAGEMENT:
   - Kanban Leads board: Located at [/dashboard/leads](/dashboard/leads).
   - Automatic Lead Capture: When a customer sends a message on WhatsApp, Facebook, Instagram, or Website Widget, they are automatically initialized and saved as a Lead in the pipeline.
   - Profile Editing: Supports editing Name, Phone, Email, Company, Address, Stage, Assigned Agent, and Follow-up Date from the Inbox sidebar or CRM board.

5. PRODUCTS & STORE CATALOG:
   - Manage your product list: Located at [/dashboard/products](/dashboard/products).
   - Adding Products: Click "Add Product" to define product Name, Price, Stock, Description, and upload Images.
   - AI Reading from Product List: The tenant's customer-facing AI reads directly from this Product List (প্রোডাক্ট লিস্ট) to instantly answer buyer questions about product names, specifications, pricing, and stock status.

6. AI TRAINING & ORCHESTRATOR:
   - AI Training panel: Located at [/dashboard/settings/ai-training](/dashboard/settings/ai-training).
   - AI Persona Prompt: Guide the AI's core persona and instructions (max 2,000 characters).
   - Business Q&As: Save up to 20 custom question-answers (max 100 characters for questions, 300 characters for answers).
   - Conversation Tags (Auto-tagging): Save up to 10 active tags (e.g., Angry Customer, Pricing Inquiry) with dynamic instructions. The AI automatically assigns matched tags to customer chats and instantly alerts agents via real-time notifications.
   - Simple greetings ("hi", "hello") are automatically answered without opening support tickets.
   - Per-channel AI Auto-Reply toggle on Inbox page & Channel Integration page.

7. FACEBOOK COMMENT AUTOMATION (SETUP, MODES & USE):
   - Overview: Automatically replies to customer comments on connected Facebook Page posts using AI. Each successful reply deducts 1 AI Response credit (zero credit deducted if Meta Graph API fails). Requires 'facebook_comment_automation' feature in active package plan.
   - Setup & Access: Go to [/dashboard/settings/inboxes](/dashboard/settings/inboxes) and click "Comment Auto-Reply" button on the connected Facebook Page card.
   - Default Behavior: Works automatically on ALL page posts by default without requiring any Post ID inputs!
   - Reply Modes:
     • Public Comment Only: AI posts a public comment reply under the customer's post comment. Normal direct Messenger inbox chat remains 100% active separately.
     • Private Message Only: Uses Meta's official Private Reply feature to send a 1-on-1 Messenger inbox message to the commenter (within Meta's 7-day window).
     • Public & Private Both: Posts a public comment reply AND sends a private Messenger inbox message simultaneously.
   - Advanced Controls:
     • Trigger Keyword Filter: Filter by specific keywords (e.g. price, dam, inbox) or select "Reply to All Comments".
     • Excluded Post IDs (Optional): Leave blank by default for all posts. Enter comma-separated Post IDs only if excluding specific posts (e.g. policy updates or sensitive notices).
     • Custom Prompt Instruction: Customize AI tone and guidelines (e.g. "Keep reply under 2 sentences and ask them to check inbox").
   - Inbox & Human Re-comment: Go to [/dashboard/inbox](/dashboard/inbox) and click the "FB Comments" channel tab to view post comments, AI responses, and post manual human re-comments directly back to Facebook. Private messages automatically sync into standard Messenger inbox threads.
   - Dashboard Analytics: Real-time comment metrics and recent comments activity can be viewed at [/dashboard](/dashboard).

8. IMAGE ANALYSIS COST POLICY:
   - When a customer sends an image via WhatsApp/Messenger/Instagram, the AI analyzes it and deducts 5 AI Responses from the tenant's quota per image.

9. BILINGUAL SUPPORT:
   - Platform UI and AI Support seamlessly support English and Bengali (বাংলা).

--------------------------------------------------
# CONFIGURATION & AUTO SETUP
Whenever the user asks to setup or connect WhatsApp, Instagram, Facebook, AI, Knowledge Base, Team, Labels, Products, Broadcast, Web Widget, Email, Telegram, or CRM:
1. Detect missing information step-by-step.
2. Call the required configuration helper or permission request tools.
3. Request explicit user confirmation before saving or modifying data.

--------------------------------------------------
# PERMISSION REQUIRED
Before ANY action that changes data, call 'request_tenant_permission' or ask:
"I am ready to make this change. Would you like me to proceed?"
Only continue after explicit user confirmation.

--------------------------------------------------
# DASHBOARD REDIRECTION POLICY
If a request requires heavy analytics or dashboard statistics (e.g. total monthly messages, sales reports, conversation charts, usage graphs):
DO NOT calculate via AI text. Call 'redirect_to_dashboard_analytics' or instruct:
"You can view the latest real-time statistics directly from your dashboard." with exact page link.

--------------------------------------------------
# BILLING SUPPORT & PLAN PURCHASING
1. Answer billing questions (Current Plan, Renewal Date, Invoice, Payment Status, Quota, Storage) directly using current tenant data provided in the context below.
2. When a user asks about plan pricing, upgrading, buying a plan, adding channels/seats, or custom plans:
   - Provide clear pricing & plan details using the ALL AVAILABLE SYSTEM PLANS list provided in context.
   - State exact plan names, prices in BDT (৳), and feature limits.
   - CUSTOM PLAN SUPPORT: YES! Custom plans ARE fully supported in ZiniChat. Tell them: "হ্যাঁ! ZiniChat-এ আপনার প্রয়োজন অনুযায়ী কাস্টম প্ল্যান নেওয়ার পূর্ণ সুবিধা রয়েছে। কাস্টম চ্যানেল বা কোটা সেটআপের জন্য আমরা সরাসরি সহযোগিতা করব।"
   - Direct them to [এখানে সাবস্ক্রিপশন দেখুন](/dashboard/settings/subscription) or offer to create a support ticket.

--------------------------------------------------
# SUPPORT TICKET CREATION
If an issue cannot be resolved, ask permission:
"It appears this issue requires assistance from our technical support team. Would you like me to create a support ticket on your behalf?"
Upon approval, call 'create_detailed_support_ticket'.

--------------------------------------------------
# OFFICIAL ZINICHAT CONTACT INFORMATION & HELPLINE
Whenever a user asks for ZiniChat's phone number, contact number, helpline, customer support phone, WhatsApp support number, office address, or email:
You MUST state ZiniChat's official contact information clearly:
- 📞 Official Phone / Helpline / WhatsApp Support: 01533894967 (+8801533894967)
- 🕒 Support Hours: 9 AM - 6 PM (Saturday to Thursday)
- ✉️ Support Email: support@zinichat.com
- 📧 Official Info Email: info@zinichat.com
- 📍 Office Address: #386, Uttar Badda, Dhaka-1212, Bangladesh
- 🌐 Official Website: https://zinichat.com

--------------------------------------------------
# SESSION MEMORY
If a "Prior Conversation Context Summary" is provided at the top of your system context, treat it as ground truth about what was already discussed. Do NOT ask the user to repeat information already captured in the summary.

--------------------------------------------------
# RESPONSE STYLE — CRITICAL
- ALWAYS communicate in Bengali unless user writes in English.
- Keep responses SHORT and DIRECT — maximum 3-4 lines per reply.
- NEVER write long paragraphs or numbered lists unless absolutely necessary.
- Use ✅ ❌ 📌 emojis sparingly to highlight key info.
- If the answer is one sentence, give one sentence. Do NOT pad responses.
- Never repeat back what the user said. Just answer.
- Action-oriented: tell the user what to do next, not what happened.

--------------------------------------------------
# BUSINESS VERTICAL AWARENESS
ZiniChat supports multiple industry verticals. Each tenant may operate in a DIFFERENT vertical mode. When a tenant's BUSINESS VERTICAL CONTEXT is provided below, you MUST use the exact terminology, page labels, and navigation paths specific to that vertical.

CRITICAL RULES:
- If a tenant asks about "Products" but they are in Healthcare mode, the page is actually called "Doctors & Care Services" — use their terminology.
- If a tenant asks about "Orders" but they are in Education mode, the page is actually called "Admissions" — use their terminology.
- ALWAYS read the TENANT BUSINESS VERTICAL CONTEXT block provided in the system context and apply it strictly.
- If no vertical context is provided, assume standard Retail/E-commerce mode.

VERTICAL QUICK REFERENCE:
| Vertical | Products Page | Orders Page | Key CRM Stage | AI Intent |
|---|---|---|---|---|
| Retail / E-commerce | Products | Orders | (default) | product_inquiry |
| Real Estate | Properties | (N/A) | Property Inquiry | property_inquiry |
| Hospitality | Rooms & Services | Room Bookings | Room Booking | room_booking_inquiry |
| Technology & Software | Software Plans | Demo Requests | Qualified | demo_request |
| Financial Services | Service Packages | Consultations | Intake | consultation_request |
| Healthcare | Doctors & Care | Appointments | Triage | appointment_request |
| Education | Courses & Programs | Admissions | Admission Pipeline | course_admission_inquiry |
| Manufacturing | Wholesale Catalog | RFQ / Quotations | RFQ | bulk_rfq_inquiry |
| Logistics | Shipping Routes | Shipments & Bookings | Shipments | shipment_quote_request |
| Other | Products | Orders | (default) | product_inquiry |`;

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private aiCacheService: AiCacheService,
    private notificationsService: NotificationsService,
    private smtpService: SmtpService
  ) {}

  /**
   * Resolves current active support conversation or creates a new active session
   */
  async getConversation(tenantId: string) {
    let conversation = await this.prisma.supportConversation.findFirst({
      where: { tenantId, status: 'active' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    // Check for inactivity timeout (30 minutes)
    if (conversation && conversation.updatedAt) {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (conversation.updatedAt < thirtyMinsAgo) {
        // Auto-close idle session
        await this.prisma.supportConversation.update({
          where: { id: conversation.id },
          data: { status: 'closed', closedAt: new Date() }
        });

        conversation = null; // Forces new session creation below
      }
    }

    if (!conversation) {
      conversation = await this.prisma.supportConversation.create({
        data: { tenantId, status: 'active' },
        include: { messages: true }
      });
    }

    return conversation;
  }

  /**
   * Manually or automatically closes current active support session
   */
  async closeSession(tenantId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: { tenantId, status: 'active' }
    });

    if (conversation) {
      const closingMsg = "আপনার সময় দেওয়ার জন্য ধন্যবাহ! যদি নতুন কোনো বিষয় বা সমস্যা দেখা দেয়, যেকোনো সময় আমায় মেসেজ দিন। 😊";
      await this.prisma.supportMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: 'ai',
          message: closingMsg
        }
      });

      await this.prisma.supportConversation.update({
        where: { id: conversation.id },
        data: { status: 'closed', closedAt: new Date() }
      });

      return { success: true, message: closingMsg };
    }

    return { success: true, message: "No active session to close." };
  }

  /**
   * Dynamically constructs real-time tenant context for AI prompt
   */
  async getTenantContext(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        subscriptions: { where: { status: 'active' }, orderBy: { currentPeriodStart: 'desc' }, take: 1 },
        channelConns: { select: { channelType: true, status: true } },
        customAiConfig: { select: { provider: true, modelName: true } }
      }
    });

    if (!tenant) return "Tenant context unavailable.";

    // Fetch all active system plans for pricing and upgrade assistance
    const allPlans = (await this.prisma.plan?.findMany?.({
      where: { isActive: true },
      orderBy: { priceMonthlyBdt: 'asc' }
    })) || [];

    const allPlansFormatted = allPlans.map(p => 
      `- ${p.name}: ৳${Number(p.priceMonthlyBdt)}/মাস | WhatsApp: ${p.whatsappLimit} | Messenger: ${p.messengerLimit} | Instagram: ${p.instagramLimit} | Messages: ${p.messageQuota === 0 ? 'Unlimited' : p.messageQuota} | AI Quota: ${p.aiQuota === 0 ? 'Unlimited' : p.aiQuota} | Seats: ${p.seatLimit}`
    ).join('\n') || '- Default Plans available on subscription page';

    const activeSubscription = tenant.subscriptions?.[0];
    const planName = tenant.customPlanName || tenant.plan?.name || "Free Tier";
    const expirationDate = activeSubscription?.currentPeriodEnd
      ? new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('bn-BD')
      : 'N/A';

    const connectedChannels = (tenant.channelConns || [])
      .map((c: any) => {
        const typeStr = typeof c.channelType === 'string' ? c.channelType : c.channelType?.code || 'channel';
        return `${typeStr.toUpperCase()} (${c.status})`;
      })
      .join(', ') || 'None';

    const plan = tenant.plan;
    // Correct field names from schema
    const messageQuota = tenant.customMessageQuota ?? plan?.messageQuota ?? 0;
    const aiQuota = tenant.customAiQuota ?? plan?.aiQuota ?? 0;
    const storageLimit = tenant.customStorageLimitMb ?? plan?.storageLimitMb ?? 0;
    const planPrice = plan?.priceMonthlyBdt ? Number(plan.priceMonthlyBdt) : 0;

    // Channel limits (custom overrides take priority)
    const waLimit = tenant.customWhatsappLimit ?? plan?.whatsappLimit ?? 0;
    const igLimit = tenant.customInstagramLimit ?? plan?.instagramLimit ?? 0;
    const msLimit = tenant.customMessengerLimit ?? plan?.messengerLimit ?? 0;
    const widgetLimit = tenant.customWebsiteWidgetLimit ?? plan?.websiteWidgetLimit ?? 0;

    // Resolve Business Nature vertical context
    const verticalContext = await this.resolveBusinessNatureContext((tenant as any).businessNature);

    return `CURRENT TENANT REAL-TIME WORKSPACE CONTEXT:
- Business Name: ${tenant.businessName} (Tenant ID: ${tenant.id})
- Active Subscription Plan: ${planName} | Price: ৳${planPrice}/month
- Plan Renewal/Expiration Date: ${expirationDate}
- Current Plan Quota — Messages: ${messageQuota === 0 ? 'Unlimited' : messageQuota} | AI Responses: ${aiQuota === 0 ? 'Unlimited' : aiQuota} | Storage: ${storageLimit === 0 ? 'Unlimited' : storageLimit + ' MB'}
- Messages Used This Cycle: ${tenant.messageCount}
- CHANNEL ALLOWANCES (0 = NOT allowed on this plan):
  WhatsApp: ${waLimit} | Instagram: ${igLimit} | Messenger: ${msLimit} | Web Widget: ${widgetLimit}
- Connected Channels: ${connectedChannels}
- Active AI Model: ${tenant.customAiConfig?.modelName || 'Platform Default'} (${tenant.customAiConfig?.provider || 'OpenAI'})
- IMAGE ANALYSIS COST: Each customer image analyzed costs 5 AI Responses from quota.

ALL AVAILABLE SYSTEM PLANS (Use for pricing, upgrades & custom requests):
${allPlansFormatted}
- CUSTOM PLAN OPTION: Yes! Custom Plans ARE fully supported. Users can request any custom WhatsApp channels (e.g., 5 channels), custom seats, or custom quotas. Offer to create a ticket for custom setup.

OFFICIAL ZINICHAT SUPPORT CONTACT DETAILS & HELPLINE:
- Phone / Helpline / WhatsApp Support: 01533894967 (+8801533894967)
- Support Hours: 9 AM - 6 PM (Saturday to Thursday)
- Support Email: support@zinichat.com
- Official Info Email: info@zinichat.com
- Office Address: #386, Uttar Badda, Dhaka-1212, Bangladesh
- Official Website: https://zinichat.com

${verticalContext}`;

  }

  /**
   * Resolves the business nature vertical context block for the Support AI.
   * Looks up BusinessNature table by tenant.businessNature name and builds
   * a vertical-specific guidance block with correct page labels, CRM stages,
   * and onboarding Q&A for the active industry mode.
   */
  private async resolveBusinessNatureContext(businessNatureName?: string | null): Promise<string> {
    if (!businessNatureName) {
      return this.buildVerticalBlock('retail');
    }

    try {
      const bn: any = await this.prisma.businessNature.findFirst({
        where: { name: businessNatureName }
      });

      if (!bn) return this.buildVerticalBlock('retail');

      if (bn.isPropertyMode)        return this.buildVerticalBlock('property');
      if (bn.isHospitalityMode)     return this.buildVerticalBlock('hospitality');
      if (bn.isTechSoftwareMode)    return this.buildVerticalBlock('tech');
      if (bn.isFinancialServiceMode) return this.buildVerticalBlock('financial');
      if (bn.isHealthcareMode)      return this.buildVerticalBlock('healthcare');
      if (bn.isEducationMode)       return this.buildVerticalBlock('education');
      if (bn.isManufacturingMode)   return this.buildVerticalBlock('manufacturing');
      if (bn.isLogisticsMode)       return this.buildVerticalBlock('logistics');

      return this.buildVerticalBlock('retail');
    } catch (err) {
      this.logger.warn(`resolveBusinessNatureContext failed: ${err.message}`);
      return this.buildVerticalBlock('retail');
    }
  }

  /**
   * Returns a formatted vertical-specific Support AI guidance block.
   */
  private buildVerticalBlock(vertical: string): string {
    const blocks: Record<string, string> = {
      property: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Real Estate & Construction (রিয়েল এস্টেট ও নির্মাণ)
🏠 এই ওয়ার্কস্পেস Property Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Properties (প্রপার্টি)" — Property listings (type, price, area, bedrooms, floor plan)
- "/dashboard/orders" পেজ = N/A — Order placement এই vertical-এ disabled
- CRM Lead Stage = "Property Inquiry" (AI auto-captures property inquiries)
- Sidebar label: "Properties"

NAVIGATION GUIDE (PROPERTY CONTEXT):
- Property/listing যোগ করতে → /dashboard/products
- Property সম্পর্কিত Lead track করতে → /dashboard/leads ("Property Inquiry" stage)
- AI Training করতে (property details, pricing FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — PROPERTY:
Q: প্রপার্টি/ফ্ল্যাট যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Property" → Property type, price, area, bedrooms, floor plan image upload করুন। AI আপনার product list থেকে সরাসরি property info পড়ে customer-কে জানাবে।

Q: Lead কোথায় আসবে?
A: Customer WhatsApp/Messenger-এ property সম্পর্কে inquire করলে AI automatically তাকে CRM-এর "Property Inquiry" stage-এ যোগ করবে।

Q: Property Agent notification কীভাবে পাবে?
A: Team member-কে "Property Agent" specialization tag দিলে AI lead capture-এ সে automatically alert পাবে।`,

      hospitality: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Hospitality, Travel & Lifestyle (হোটেল, ভ্রমণ ও লাইফস্টাইল)
🏨 এই ওয়ার্কস্পেস Room Booking Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Rooms & Services (রুম ও সেবা)" — Room type, capacity, price/night, amenities
- "/dashboard/orders" পেজ = "Room Bookings (রুম বুকিং)" — Booking status, check-in/out dates
- CRM Lead Stage = "Room Booking" (AI auto-captures room booking requests)
- Sidebar label: "Rooms & Services"

NAVIGATION GUIDE (HOSPITALITY CONTEXT):
- Room/service যোগ করতে → /dashboard/products
- Room Booking দেখতে ও ম্যানেজ করতে → /dashboard/orders
- Booking lead track করতে → /dashboard/leads ("Room Booking" stage)
- AI Training করতে (room details, pricing, amenities FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — HOSPITALITY:
Q: রুম যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Room" → Room type, capacity, price per night, amenities, images দিন। AI product list থেকে room availability ও pricing জানাবে।

Q: Room Booking কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব room booking request আসে।

Q: AI কীভাবে booking নেয়?
A: Customer room চাইলে AI automatically তাকে CRM-এর "Room Booking" stage-এ রেখে আপনাকে notify করে।`,

      tech: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Technology & Software (প্রযুক্তি ও সফটওয়্যার)
💻 এই ওয়ার্কস্পেস Software & Tech Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Software Plans & Pricing (সফটওয়্যার প্ল্যান)" — Plan tier, features, demo URL
- "/dashboard/orders" পেজ = "Demo Requests (ডেমো রিকুয়েস্ট)" — Demo request status
- CRM Lead Stage = "Qualified" (AI auto-moves demo prospects)
- Sidebar label: "Software Plans"
- ⚠️ AI e-commerce order placement এই vertical-এ disabled

NAVIGATION GUIDE (TECH CONTEXT):
- Software plan/pricing যোগ করতে → /dashboard/products
- Demo request দেখতে → /dashboard/orders
- Qualified lead track করতে → /dashboard/leads ("Qualified" stage)
- AI Training করতে → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — TECH:
Q: Software plan যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Plan" → Plan name, tier, features list, monthly/yearly price, demo URL দিন।

Q: Demo Request কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব demo request আসে।

Q: AI কীভাবে demo schedule করে?
A: Customer demo চাইলে AI তাকে "Qualified" CRM stage-এ move করে Account Executive/Product Specialist-কে notify করে।`,

      financial: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Financial & Professional Services (আর্থিক ও পেশাদার সেবা)
💼 এই ওয়ার্কস্পেস Financial & Consulting Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Service Packages (সেবা প্যাকেজ)" — Service name, scope of work, fees
- "/dashboard/orders" পেজ = "Consultations (কনসালটেশন)" — Consultation requests
- CRM Lead Stage = "Intake" (AI auto-captures consultation requests)
- Sidebar label: "Services"
- ⚠️ AI retail order placement এই vertical-এ disabled

NAVIGATION GUIDE (FINANCIAL CONTEXT):
- Service package যোগ করতে → /dashboard/products
- Consultation request দেখতে → /dashboard/orders
- Intake lead track করতে → /dashboard/leads ("Intake" stage)
- AI Training করতে → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — FINANCIAL:
Q: Service package যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Service" → Service name, scope, fees, duration দিন।

Q: Consultation request কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব consultation request আসে।

Q: AI কীভাবে consultation capture করে?
A: Customer service/consultation চাইলে AI তাকে CRM-এর "Intake" stage-এ যোগ করে।`,

      healthcare: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Healthcare & Clinics (স্বাস্থ্যসেবা)
🩺 এই ওয়ার্কস্পেস Healthcare & Clinic Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Doctors & Care Services (ডাক্তার ও সেবা)" — Doctor name, specialization, visiting hours, fees
- "/dashboard/orders" পেজ = "Appointments (অ্যাপয়েন্টমেন্ট)" — Appointment schedule and status
- CRM Lead Stage = "Triage" (AI auto-captures appointment requests)
- Sidebar label: "Doctors & Care"
- ⚠️ AI retail order placement এই vertical-এ disabled

NAVIGATION GUIDE (HEALTHCARE CONTEXT):
- Doctor/service profile যোগ করতে → /dashboard/products
- Appointment দেখতে ও ম্যানেজ করতে → /dashboard/orders
- Patient/lead track করতে → /dashboard/leads ("Triage" stage)
- AI Training করতে (doctor bios, services, visiting hours FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — HEALTHCARE:
Q: ডাক্তার/সেবা যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Doctor" → নাম, বিভাগ (specialization), ভিজিটিং সময়, ফি, ছবি দিন। AI আপনার doctor list থেকে সরাসরি patient-কে info দেবে।

Q: Appointment কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব appointment request আসে।

Q: AI কীভাবে appointment নেয়?
A: Customer doctor বা appointment চাইলে AI automatically তাকে CRM-এর "Triage" stage-এ যোগ করে এবং "Doctor Assistant" tagged team member-কে notify করে।`,

      education: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Education & Academies (শিক্ষা)
🎓 এই ওয়ার্কস্পেস Education & Course Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Courses & Academic Programs (কোর্স ও একাডেমিক প্রোগ্রাম)" — Course name, duration, batch schedule, fees
- "/dashboard/orders" পেজ = "Admissions (ভর্তি)" — Admission applications and status
- CRM Lead Stage = "Admission Pipeline" (AI auto-captures course admission inquiries)
- Sidebar label: "Courses & Batches"
- ⚠️ AI retail order placement এই vertical-এ disabled

NAVIGATION GUIDE (EDUCATION CONTEXT):
- Course/batch যোগ করতে → /dashboard/products
- Admission দেখতে ও ম্যানেজ করতে → /dashboard/orders
- Admission lead track করতে → /dashboard/leads ("Admission Pipeline" stage)
- AI Training করতে (course details, fees, batch FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — EDUCATION:
Q: Course যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Course" → Course name, duration, batch schedule, fees, prerequisites দিন। AI course list থেকে student-দের সরাসরি info দেবে।

Q: Admission কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব admission application আসে।

Q: AI কীভাবে admission নেয়?
A: Student course সম্পর্কে inquire করলে AI তাকে CRM-এর "Admission Pipeline" stage-এ যোগ করে।`,

      manufacturing: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Manufacturing & Industrial (উৎপাদন ও শিল্প)
🏭 এই ওয়ার্কস্পেস Factory B2B Bulk Quote Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Wholesale Products & Factory Catalog (হোলসেল পণ্য)" — Product name, MOQ, bulk pricing, specs
- "/dashboard/orders" পেজ = "RFQ / Quotations (আরএফকিউ)" — Bulk quote requests
- CRM Lead Stage = "RFQ" (AI auto-captures bulk RFQ inquiries)
- Sidebar label: "Wholesale Catalog"
- ⚠️ AI retail order placement এই vertical-এ disabled (B2B bulk RFQ flow ব্যবহার হয়)

NAVIGATION GUIDE (MANUFACTURING CONTEXT):
- Factory product/catalog যোগ করতে → /dashboard/products
- RFQ/Quotation দেখতে ও ম্যানেজ করতে → /dashboard/orders
- B2B lead track করতে → /dashboard/leads ("RFQ" stage)
- AI Training করতে (product specs, MOQ, pricing FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — MANUFACTURING:
Q: Factory product/item catalog-এ যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Product" → Product name, MOQ, bulk unit price (tiered), specs দিন। AI catalog থেকে buyer-কে তথ্য দেবে।

Q: RFQ / Quotation কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব bulk RFQ request আসে।

Q: AI কীভাবে bulk order নেয়?
A: Buyer bulk quantity বা quote চাইলে AI তাকে CRM-এর "RFQ" stage-এ যোগ করে।`,

      logistics: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Logistics & Infrastructure (লজিস্টিকস, পরিবহন ও অবকাঠামো)
🚛 এই ওয়ার্কস্পেস Shipping & Logistics Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Shipping Routes & Rates (শিপিং রুট ও রেট)" — Route, fleet capacity, freight rates
- "/dashboard/orders" পেজ = "Shipments & Bookings (শিপমেন্ট ও বুকিং)" — Shipment tracking and status
- CRM Lead Stage = "Shipments & Bookings" (AI auto-captures shipment quote requests)
- Sidebar label: "Routes & Rates"
- ⚠️ AI retail order placement এই vertical-এ disabled

NAVIGATION GUIDE (LOGISTICS CONTEXT):
- Shipping route/rate যোগ করতে → /dashboard/products
- Shipment দেখতে ও track করতে → /dashboard/orders
- Shipment lead track করতে → /dashboard/leads ("Shipments & Bookings" stage)
- AI Training করতে (routes, freight rates FAQs) → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — LOGISTICS:
Q: Shipping route যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Route" → Route name, origin-destination, fleet capacity, freight rate দিন। AI route list থেকে customer-কে shipping info দেবে।

Q: Shipment কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব shipment booking আসে।

Q: AI কীভাবে shipment quote নেয়?
A: Customer route বা shipping quote চাইলে AI তাকে CRM-এর "Shipments & Bookings" stage-এ যোগ করে এবং "Logistics Dispatcher" tagged team member-কে notify করে।`,

      retail: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TENANT BUSINESS VERTICAL: Retail, E-commerce & Trading (খুচরা ব্যবসা ও ই-কমার্স)
🛒 এই ওয়ার্কস্পেস Standard E-commerce/Retail Mode-এ পরিচালিত।

PAGE LABELS FOR THIS TENANT:
- "/dashboard/products" পেজ = "Products (পণ্য)" — Product name, price, stock, description, images
- "/dashboard/orders" পেজ = "Orders (অর্ডার)" — Customer order management
- CRM Lead Stage = Standard pipeline
- Sidebar label: "Products"
- ✅ AI order placement সক্রিয় (customer-রা WhatsApp-এ অর্ডার দিতে পারে)

NAVIGATION GUIDE (RETAIL CONTEXT):
- Product যোগ করতে → /dashboard/products
- Order দেখতে → /dashboard/orders
- Lead/CRM → /dashboard/leads
- AI Training করতে → /dashboard/settings/ai-training

COMMON SUPPORT QUESTIONS — RETAIL:
Q: Product যোগ করব কীভাবে?
A: [/dashboard/products](/dashboard/products) → "Add Product" → Name, price, stock, description, images দিন। AI product list থেকে customer-কে তথ্য ও অর্ডার নেবে।

Q: Order কোথায় দেখব?
A: [/dashboard/orders](/dashboard/orders) পেজে সব customer order দেখা যায়।

Q: AI কীভাবে অর্ডার নেয়?
A: Customer product নাম বললে AI stock check করে, confirm নিয়ে, Order record তৈরি করে আপনাকে notify করে।`
    };

    return blocks[vertical] ?? blocks['retail'];
  }

  /**
   * Generates a rolling context summary using AI (called every 10 messages)
   */
  private async generateAndSaveContextSummary(
    conversationId: string,
    messages: any[],
    openai: OpenAI,
    modelName: string,
    provider: string
  ): Promise<string> {
    try {
      const transcript = messages
        .map(m => `${m.senderType === 'user' ? 'User' : 'AI'}: ${m.message}`)
        .join('\n');

      const summaryResponse = await openai.chat.completions.create({
        model: provider === 'gemini' ? 'gemini-2.0-flash' : modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a context summarizer. Summarize the following support chat conversation into 3-5 bullet points in Bengali, focusing on: what the user is trying to do, what has already been completed, what is still pending, and any relevant config details shared. Be brief and factual.'
          },
          { role: 'user', content: transcript }
        ]
      });

      const summary = summaryResponse.choices[0]?.message?.content || '';
      if (summary) {
        await this.prisma.supportConversation.update({
          where: { id: conversationId },
          data: { contextSummary: summary }
        });
      }
      return summary;
    } catch (err) {
      this.logger.warn(`Context summary generation failed: ${err.message}`);
      return '';
    }
  }

  /**
   * Main Support Chat Message Handler
   */
  async sendMessage(tenantId: string, message: string) {
    // Code-level security: Enforce tenantId binding
    const conversation = await this.getConversation(tenantId);

    // Save user message
    await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: 'user',
        message: message
      }
    });

    // Fetch conversation history for active session
    const allHistory = await this.prisma.supportMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' }
    });

    // Limit to last 30 messages for context window efficiency
    const history = allHistory.slice(-30);

    // Determine AiConfig
    let aiConfig = await this.prisma.aiConfig.findFirst({
      where: { isSupportDefault: true }
    });

    if (!aiConfig) {
      aiConfig = await this.prisma.aiConfig.findFirst({
        where: { isActive: true }
      });
    }

    if (!aiConfig) {
      const fallbackMsg = "AI কনফিগারেশন সেটআপ করা নেই। দয়া করে ফোন কলের মাধ্যমে সাপোর্ট টিমের সাথে যোগাযোগ করুন।";
      await this.prisma.supportMessage.create({
        data: { conversationId: conversation.id, senderType: 'ai', message: fallbackMsg }
      });
      return { success: true, message: fallbackMsg };
    }

    // STEP 1: Resolve vertical block early — needed for cache key computation
    const tenantRecord = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { businessNature: true }
    }) as any;
    const verticalName = tenantRecord?.businessNature || 'retail';
    const verticalBlock = await this.resolveBusinessNatureContext(verticalName);

    // STEP 2: Build prompt parts
    //   CACHEABLE PREFIX  = static system prompt + vertical block (stable across tenants of same vertical)
    //   DYNAMIC SUFFIX    = tenant-specific context (name, plan, quota, channels) — NOT cached
    const baseSystemPrompt = aiConfig.systemPrompt || DEFAULT_SUPPORT_AI_SYSTEM_PROMPT;

    // Cacheable prefix: base system prompt + vertical block
    // This stays identical for all tenants in the same vertical → OpenAI prefix-cache hits
    const cacheablePrefix = `${baseSystemPrompt}\n\n${verticalBlock}`;

    // STEP 3: Attempt prompt cache (vertical-aware)
    // For Gemini: explicit cached_content reference (if threshold met)
    // For OpenAI: stable prefix ensures automatic prefix-caching
    let activeSupportCacheKey: string | undefined = undefined;
    try {
      const supportCache = await this.aiCacheService.getOrCreateSupportCache({
        aiConfigId: aiConfig.id,
        provider: aiConfig.provider || 'gemini',
        modelName: aiConfig.modelName,
        apiKey: aiConfig.apiKey,
        baseSystemPrompt: cacheablePrefix,
        verticalName
      });
      if (supportCache.isCached && supportCache.cacheKey) {
        activeSupportCacheKey = supportCache.cacheKey;
        this.logger.debug(`[Support Cache] HIT — vertical=${verticalName}, key=${activeSupportCacheKey}`);
      }
    } catch (cacheErr: any) {
      this.logger.debug(`Support AI prompt caching skipped or failed: ${cacheErr.message}`);
    }

    // STEP 4: Build dynamic tenant context (NOT part of cache — changes per tenant)
    const tenantContext = await this.getTenantContext(tenantId);

    // STEP 5: Re-fetch conversation for contextSummary
    const convo = await this.prisma.supportConversation.findUnique({
      where: { id: conversation.id }
    });

    // STEP 6: Assemble full system prompt
    // Structure: [CACHEABLE PREFIX] + [PRIOR SUMMARY (optional)] + [DYNAMIC TENANT CONTEXT]
    // The cacheable prefix MUST come first and remain identical across calls for prefix-caching to work.
    const priorSummaryBlock = convo?.contextSummary
      ? `\n\n--------------------------------------------------\n# PRIOR CONVERSATION CONTEXT SUMMARY\n${convo.contextSummary}\n--------------------------------------------------`
      : '';

    const fullSystemPrompt = `${cacheablePrefix}${priorSummaryBlock}\n\n${tenantContext}`;

    const messages_payload = [
      { role: 'system', content: fullSystemPrompt },
      ...history.map(msg => ({
        role: msg.senderType === 'user' ? 'user' : 'assistant',
        content: msg.message
      }))
    ];

    // Function Calling Tools
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_tenant_workspace_status',
          description: 'Gets current workspace settings, channels status, and active plan details for the current tenant.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'request_tenant_permission',
          description: 'Asks the tenant user for explicit confirmation before executing any configuration change or data modification.',
          parameters: {
            type: 'object',
            properties: {
              action_type: { type: 'string', description: 'The change to perform (e.g., update_ai_prompt, connect_whatsapp, create_label)' },
              description: { type: 'string', description: 'User-friendly Bengali explanation of what will be modified' }
            },
            required: ['action_type', 'description']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'navigate_to_page',
          description: 'Provides exact navigation steps and direct page link when tenant asks where or how to configure something. ONLY use paths from the NAVIGATION MAP.',
          parameters: {
            type: 'object',
            properties: {
              page_name: { type: 'string', description: 'The title of the page' },
              path: { type: 'string', description: 'The exact frontend route path from the NAVIGATION MAP (e.g. /dashboard/settings/inboxes)' },
              navigation_steps: { type: 'string', description: 'Step by step navigation menu path' }
            },
            required: ['page_name', 'path', 'navigation_steps']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'show_channel_connect_ui',
          description: 'Renders an interactive channel connection UI (Facebook OAuth button + manual form) directly inside the chat widget. Call this when user wants to connect WhatsApp Official API, Instagram, or Messenger.',
          parameters: {
            type: 'object',
            properties: {
              channel_type: {
                type: 'string',
                description: 'The channel to connect: whatsapp_official, instagram, or messenger'
              },
              instructions: {
                type: 'string',
                description: 'Bengali instructions to show the user above the connect UI'
              }
            },
            required: ['channel_type', 'instructions']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'redirect_to_dashboard_analytics',
          description: 'Redirects tenant to dashboard visual charts whenever heavy analytics or message count reports are requested.',
          parameters: {
            type: 'object',
            properties: {
              dashboard_path: { type: 'string', description: 'Target dashboard route (e.g. /dashboard)' },
              reason: { type: 'string', description: 'Reason for redirection' }
            },
            required: ['dashboard_path', 'reason']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_detailed_support_ticket',
          description: 'Creates a technical support ticket when human engineering assistance is needed.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'Contact phone number' },
              issue_summary: { type: 'string', description: 'Detailed summary of the technical issue' },
              category: { type: 'string', description: 'Issue category' },
              priority: { type: 'string', description: 'low, medium, or high' }
            },
            required: ['phone', 'issue_summary']
          }
        }
      }
    ];

    try {
      let baseURL = aiConfig.apiEndpoint || undefined;
      if (aiConfig.provider === 'gemini' && !baseURL) {
        baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      }

      const openai = new OpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: baseURL
      });

      let responseMessage: any;

      // Build extra parameters for Gemini native cached_content (if cache key is available)
      // OpenAI prefix-caching is automatic — no extra params needed
      const geminiCacheExtra = activeSupportCacheKey && (aiConfig.provider || 'gemini').toLowerCase() === 'gemini'
        ? { extra_body: { cached_content: activeSupportCacheKey } }
        : {};

      try {
        const response = await openai.chat.completions.create({
          model: aiConfig.modelName,
          messages: messages_payload as any,
          tools: tools as any,
          tool_choice: 'auto',
          ...geminiCacheExtra
        } as any);
        responseMessage = response.choices[0].message;
      } catch (innerError) {
        this.logger.warn(`AI model ${aiConfig.modelName} failed: ${innerError.message}. Fallback...`);
        const fallbackResponse = await openai.chat.completions.create({
          model: aiConfig.provider === 'gemini' ? 'gemini-2.0-flash' : aiConfig.modelName,
          messages: messages_payload as any
        });
        responseMessage = fallbackResponse.choices[0].message;
      }

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall: any = responseMessage.tool_calls[0];
        const fnName = toolCall.function?.name;
        const args = JSON.parse(toolCall.function?.arguments || '{}');

        let replyMsg = '';

        if (fnName === 'create_detailed_support_ticket') {
          const subject = `AI Escalated: ${args.issue_summary}`;
          const ticket = await this.prisma.ticket.create({
            data: {
              tenantId,
              subject: subject,
              type: args.category || 'Technical Support',
              status: 'open',
              priority: args.priority || 'medium',
              messages: {
                create: {
                  senderType: 'tenant',
                  senderId: (await this.prisma.user.findFirst({ where: { tenantId } }))?.id || 'system',
                  message: `Phone: ${args.phone}\nIssue: ${args.issue_summary}\nTenant ID: ${tenantId}`
                }
              }
            },
            include: { tenant: true }
          });

          await this.notificationsService.createSystemNotificationForSuperadmins(
            `New Ticket via AI: ${subject}`,
            `A support ticket was auto-escalated for ${ticket.tenant.businessName}`,
            'system'
          );
          await this.smtpService.triggerTicketCreatedEmail(ticket.tenant.businessName, subject, 'medium');

          // Notify tenant workspace admins/owners (Event Parity)
          const tenantAdmins = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
          for (const admin of tenantAdmins) {
            this.notificationsService.createNotification(
              admin.id,
              'Ticket Created via AI Support',
              `A support ticket '${subject}' was automatically created for your workspace.`,
              'system'
            ).catch(() => {});
          }

          replyMsg = `আপনার জন্য সাপোর্ট টিকিট #${ticket.id.slice(0, 8)} সফলভাবে ওপেন করা হয়েছে। আমাদের টেকনিক্যাল টিম খুব শীঘ্রই যোগাযোগ করবে।`;

        } else if (fnName === 'request_tenant_permission') {
          replyMsg = `ACTION_PERMISSION_REQUEST:{"actionType":"${args.action_type}","description":"${args.description}"}\n\nআমি এই পরিবর্তনটি সম্পাদন করতে প্রস্তুত। আপনি কি সম্মতি দিচ্ছেন?`;

        } else if (fnName === 'navigate_to_page') {
          replyMsg = `📌 **${args.page_name}**:\n${args.navigation_steps}\n\n[এখানে ক্লিক করুন](${args.path})`;

        } else if (fnName === 'show_channel_connect_ui') {
          replyMsg = `CHANNEL_CONNECT_UI:{"channelType":"${args.channel_type}","instructions":"${args.instructions.replace(/"/g, '\\"')}"}`;

        } else if (fnName === 'redirect_to_dashboard_analytics') {
          replyMsg = `📊 আপনি আপনার ড্যাশবোর্ড থেকে লাইভ পরিসংখ্যান দেখতে পারবেন:\n\n[📊 ড্যাশবোর্ডে যান](${args.dashboard_path})`;

        } else if (fnName === 'get_tenant_workspace_status') {
          replyMsg = `আপনার ওয়ার্কস্পেসের বর্তমান বিবরণ:\n${tenantContext}`;
        } else {
          replyMsg = responseMessage.content || 'প্রসেস সম্পন্ন হয়েছে।';
        }

        await this.prisma.supportMessage.create({
          data: { conversationId: conversation.id, senderType: 'ai', message: replyMsg }
        });

        // Trigger context summary every 10 messages
        const totalMsgCount = allHistory.length + 1; // +1 for the AI reply we just created
        if (totalMsgCount > 0 && totalMsgCount % 10 === 0) {
          const fullHistory = await this.prisma.supportMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' }
          });
          await this.generateAndSaveContextSummary(
            conversation.id, fullHistory, openai, aiConfig.modelName, aiConfig.provider
          );
        }

        return { success: true, message: replyMsg };

      } else {
        const aiResponse = responseMessage.content || '';
        await this.prisma.supportMessage.create({
          data: { conversationId: conversation.id, senderType: 'ai', message: aiResponse }
        });

        // Trigger context summary every 10 messages
        const totalMsgCount = allHistory.length + 1;
        if (totalMsgCount > 0 && totalMsgCount % 10 === 0) {
          const fullHistory = await this.prisma.supportMessage.findMany({
            where: { conversationId: conversation.id },
            orderBy: { createdAt: 'asc' }
          });
          await this.generateAndSaveContextSummary(
            conversation.id, fullHistory, openai, aiConfig.modelName, aiConfig.provider
          );
        }

        return { success: true, message: aiResponse };
      }

    } catch (error) {
      this.logger.error(`Error in Support AI: ${error.message}`);
      const errorMsg = "দুঃখিত, এই মুহূর্তে সার্ভিস সাড়া দিচ্ছে না। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
      await this.prisma.supportMessage.create({
        data: { conversationId: conversation.id, senderType: 'ai', message: errorMsg }
      });
      return { success: true, message: errorMsg };
    }
  }

  /**
   * Superadmin method: Fetch all support conversations (active and closed)
   */
  async getConversationsForSuperadmin() {
    return this.prisma.supportConversation.findMany({
      include: {
        tenant: {
          select: { id: true, businessName: true, phoneNo: true }
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  /**
   * Superadmin method: Fetch specific tenant support conversation messages
   */
  async getConversationMessagesForSuperadmin(conversationId: string) {
    return this.prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: {
        tenant: { select: { id: true, businessName: true, phoneNo: true } },
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  /**
   * Superadmin method: Get active support prompt or default template
   */
  async getSupportPrompt() {
    let aiConfig = await this.prisma.aiConfig.findFirst({
      where: { isSupportDefault: true }
    });
    if (!aiConfig) {
      aiConfig = await this.prisma.aiConfig.findFirst({
        where: { isActive: true }
      });
    }
    return {
      prompt: aiConfig?.systemPrompt || DEFAULT_SUPPORT_AI_SYSTEM_PROMPT,
      isCustom: !!aiConfig?.systemPrompt,
      configId: aiConfig?.id || null
    };
  }

  /**
   * Superadmin method: Save custom support AI system prompt
   */
  async updateSupportPrompt(prompt: string) {
    let aiConfig = await this.prisma.aiConfig.findFirst({
      where: { isSupportDefault: true }
    });
    if (!aiConfig) {
      aiConfig = await this.prisma.aiConfig.findFirst({
        where: { isActive: true }
      });
    }

    if (aiConfig) {
      await this.prisma.aiConfig.update({
        where: { id: aiConfig.id },
        data: { systemPrompt: prompt }
      });
      return { success: true, message: "Support AI System Prompt updated successfully." };
    }

    return { success: false, message: "No active AI Configuration found to save prompt." };
  }
}
