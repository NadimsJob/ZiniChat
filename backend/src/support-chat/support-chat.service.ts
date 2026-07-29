import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
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
| Channels & Inboxes (WhatsApp, Instagram, Messenger setup) | /dashboard/settings/inboxes |
| Add New Channel / Inbox | /dashboard/settings/inboxes/new |
| AI Training / Knowledge Base | /dashboard/settings/ai-training |
| Subscription / Plan | /dashboard/settings/subscription |
| Billing History | /dashboard/settings/billing-history |
| Storage | /dashboard/settings/storage |
| Labels | /dashboard/settings/labels |
| Team | /dashboard/team |
| Leads / CRM | /dashboard/leads |
| Broadcasts | /dashboard/broadcasts |
| Orders | /dashboard/orders |
| Support | /dashboard/support |

NEVER invent or guess paths. ONLY use paths from this table.
ALWAYS format page links using markdown syntax, for example: [এখানে ব্রডকাস্ট করুন](/dashboard/broadcasts) or [এখানে সাবস্ক্রিপশন দেখুন](/dashboard/settings/subscription). NEVER output raw unformatted path strings.

--------------------------------------------------
# WHATSAPP OFFICIAL API SETUP GUIDE
When a user asks to connect WhatsApp Official Business API:
1. ALWAYS call the tool 'show_channel_connect_ui' with channel_type = 'whatsapp_official'.
2. This will render an interactive Facebook Login button and Manual Setup form directly in the chat.
3. Do NOT just provide a link. Always call show_channel_connect_ui.
4. After calling the tool, explain what the user will see: "নিচের বাটনে ক্লিক করে আপনার Meta Business অ্যাকাউন্টে লগইন করুন। অথবা আপনার কাছে Phone Number ID, Access Token এবং WABA ID থাকলে ম্যানুয়াল ফর্ম পূরণ করুন।"

--------------------------------------------------
# SUPPORT BEHAVIOR
Always answer using current tenant configuration, settings, connected channels, subscription, documentation, and activity. Never hallucinate.
The tenant's full plan details (message quota, AI response quota, storage limit, price) are provided in the CURRENT TENANT REAL-TIME WORKSPACE CONTEXT below — use them directly to answer billing/quota questions.

--------------------------------------------------
# IMAGE COST POLICY (IMPORTANT)
When a customer sends an image via WhatsApp/Messenger/Instagram, the AI analyzes it and deducts 5 AI Responses from the tenant's quota per image. If a tenant asks why their AI quota decreased, explain this clearly: "প্রতিটি ইনকামিং ইমেজ বিশ্লেষণে ৫টি এআই রেসপন্স কোটা কাটা হয়।"

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
# BILLING SUPPORT
Answer billing questions (Current Plan, Renewal Date, Invoice, Payment Status, Quota, Storage) directly using current tenant data provided in the context below.

--------------------------------------------------
# SUPPORT TICKET CREATION
If an issue cannot be resolved, ask permission:
"It appears this issue requires assistance from our technical support team. Would you like me to create a support ticket on your behalf?"
Upon approval, call 'create_detailed_support_ticket'.

--------------------------------------------------
# SESSION MEMORY
If a "Prior Conversation Context Summary" is provided at the top of your system context, treat it as ground truth about what was already discussed. Do NOT ask the user to repeat information already captured in the summary.

--------------------------------------------------
# PLAN PURCHASING & UPGRADE ASSISTANCE (CRITICAL)
When a user asks about plan pricing, upgrading, buying a plan, adding channels/seats, or custom plans:
1. ALWAYS provide clear, helpful pricing & plan details using the ALL AVAILABLE SYSTEM PLANS list provided in the context below.
2. State exact plan names, prices in BDT (৳), and feature limits (WhatsApp limit, AI quota, seats).
3. CUSTOM PLAN SUPPORT: YES! Custom plans ARE fully supported in ZiniChat. If a user asks for custom channels (e.g., 5 WhatsApp channels), extra seats, or custom quotas, tell them: "হ্যাঁ! ZiniChat-এ আপনার প্রয়োজন অনুযায়ী কাস্টম প্ল্যান নেওয়ার পূর্ণ সুবিধা রয়েছে। কাস্টম চ্যানেল বা কোটা সেটআপের জন্য আমরা সরাসরি সহযোগিতা করব।"
4. Help them upgrade: Tell them to visit [এখানে সাবস্ক্রিপশন দেখুন](/dashboard/settings/subscription) or offer: "আমি কি আপনার জন্য একটি সাপোর্টিং টিকিট তৈরি করব যাতে আমাদের সেলস টিম আপনার সাথে যোগাযোগ করে কাস্টম প্ল্যান অ্যাক্টিভ করে দেয়?"
5. NEVER say custom plans are unavailable. Always proactively assist the user with pricing and upgrade guidance.

--------------------------------------------------
# RESPONSE STYLE — CRITICAL
- ALWAYS communicate in Bengali unless user writes in English.
- Keep responses SHORT and DIRECT — maximum 3-4 lines per reply.
- NEVER write long paragraphs or numbered lists unless absolutely necessary.
- Use ✅ ❌ 📌 emojis sparingly to highlight key info.
- If the answer is one sentence, give one sentence. Do NOT pad responses.
- Never repeat back what the user said. Just answer.
- Action-oriented: tell the user what to do next, not what happened.`;

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
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
- CUSTOM PLAN OPTION: Yes! Custom Plans ARE fully supported. Users can request any custom WhatsApp channels (e.g., 5 channels), custom seats, or custom quotas. Offer to create a ticket for custom setup.`;

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

    // Build Tenant Context
    const tenantContext = await this.getTenantContext(tenantId);

    // Re-fetch conversation for contextSummary
    const convo = await this.prisma.supportConversation.findUnique({
      where: { id: conversation.id }
    });

    // Base System Prompt
    const baseSystemPrompt = aiConfig.systemPrompt || DEFAULT_SUPPORT_AI_SYSTEM_PROMPT;

    // Inject prior context summary if available
    const priorSummaryBlock = convo?.contextSummary
      ? `\n\n--------------------------------------------------\n# PRIOR CONVERSATION CONTEXT SUMMARY\n${convo.contextSummary}\n--------------------------------------------------`
      : '';

    const fullSystemPrompt = `${baseSystemPrompt}${priorSummaryBlock}\n\n${tenantContext}`;

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

      try {
        const response = await openai.chat.completions.create({
          model: aiConfig.modelName,
          messages: messages_payload as any,
          tools: tools as any,
          tool_choice: 'auto'
        });
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
