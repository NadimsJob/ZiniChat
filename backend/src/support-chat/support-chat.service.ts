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
# SUPPORT BEHAVIOR
Always answer using current tenant configuration, settings, connected channels, subscription, documentation, and activity. Never hallucinate.

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
Answer billing questions (Current Plan, Renewal Date, Invoice, Payment Status, Quota, Storage) directly using current tenant data.

--------------------------------------------------
# SUPPORT TICKET CREATION
If an issue cannot be resolved, ask permission:
"It appears this issue requires assistance from our technical support team. Would you like me to create a support ticket on your behalf?"
Upon approval, call 'create_detailed_support_ticket'.

--------------------------------------------------
# RESPONSE STYLE
Always communicate in Bengali unless the user speaks in English. Be professional, friendly, concise, action-oriented, and step-by-step.`;

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
      const closingMsg = "আপনার সময় দেওয়ার জন্য ধন্যবাদ! যদি নতুন কোনো বিষয় বা সমস্যা দেখা দেয়, যেকোনো সময় আমায় মেসেজ দিন। 😊";
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

    return `CURRENT TENANT REAL-TIME WORKSPACE CONTEXT:
- Business Name: ${tenant.businessName} (Tenant ID: ${tenant.id})
- Active Subscription Plan: ${planName} (Expires/Renews: ${expirationDate})
- Connected Channels: ${connectedChannels}
- Total Messages Sent This Cycle: ${tenant.messageCount}
- Active AI Model: ${tenant.customAiConfig?.modelName || 'Platform Default'} (${tenant.customAiConfig?.provider || 'OpenAI'})`;
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
    const history = await this.prisma.supportMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' }
    });

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
      const fallbackMsg = "AI কনফিগারেশন সেটআপ করা নেই। দয়া করে ফোন কলের মাধ্যমে সাপোর্ট টিমের সাথে যোগাযোগ করুন।";
      await this.prisma.supportMessage.create({
        data: { conversationId: conversation.id, senderType: 'ai', message: fallbackMsg }
      });
      return { success: true, message: fallbackMsg };
    }

    // Build Tenant Context
    const tenantContext = await this.getTenantContext(tenantId);

    // Base System Prompt
    const baseSystemPrompt = DEFAULT_SUPPORT_AI_SYSTEM_PROMPT;

    const fullSystemPrompt = `${baseSystemPrompt}\n\n${tenantContext}`;

    const messages = [
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
          description: 'Provides exact navigation steps and direct page link when tenant asks where or how to configure something.',
          parameters: {
            type: 'object',
            properties: {
              page_name: { type: 'string', description: 'The title of the page' },
              path: { type: 'string', description: 'The frontend route path (e.g. /dashboard/settings/ai-training)' },
              navigation_steps: { type: 'string', description: 'Step by step navigation menu path' }
            },
            required: ['page_name', 'path', 'navigation_steps']
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
          messages: messages as any,
          tools: tools as any,
          tool_choice: 'auto'
        });
        responseMessage = response.choices[0].message;
      } catch (innerError) {
        this.logger.warn(`AI model ${aiConfig.modelName} failed: ${innerError.message}. Fallback...`);
        const fallbackResponse = await openai.chat.completions.create({
          model: aiConfig.provider === 'gemini' ? 'gemini-2.0-flash' : aiConfig.modelName,
          messages: messages as any
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

          replyMsg = `আপনার জন্য সাপোর্ট টিকিট #${ticket.id.slice(0, 8)} সফলভাবে ওপেন করা হয়েছে। আমাদের টেকনিক্যাল টিম খুব শীঘ্রই যোগাযোগ করবে।`;

        } else if (fnName === 'request_tenant_permission') {
          replyMsg = `ACTION_PERMISSION_REQUEST:{"actionType":"${args.action_type}","description":"${args.description}"}\n\nআমি এই পরিবর্তনটি সম্পাদন করতে প্রস্তুত। আপনি কি সম্মতি দিচ্ছেন?`;

        } else if (fnName === 'navigate_to_page') {
          replyMsg = `📌 **${args.page_name}**:\n${args.navigation_steps}\n\n[এখানে ক্লিক করুন](${args.path})`;

        } else if (fnName === 'redirect_to_dashboard_analytics') {
          replyMsg = `📊 আপনি আপনার ড্যাশবোর্ড থেকে লাইভ পরিসংখ্যান দেখতে পারবেন:\n\n[📊 ড্যাশবোর্ডে যান](${args.dashboard_path})`;

        } else if (fnName === 'get_tenant_workspace_status') {
          replyMsg = `আপনার ওয়ার্কস্পেসের বর্তমান বিবরণ:\n${tenantContext}`;
        } else {
          replyMsg = responseMessage.content || 'প্রসেস সম্পন্ন হয়েছে।';
        }

        await this.prisma.supportMessage.create({
          data: { conversationId: conversation.id, senderType: 'ai', message: replyMsg }
        });

        return { success: true, message: replyMsg };

      } else {
        const aiResponse = responseMessage.content || '';
        await this.prisma.supportMessage.create({
          data: { conversationId: conversation.id, senderType: 'ai', message: aiResponse }
        });
        return { success: true, message: aiResponse };
      }

    } catch (error) {
      this.logger.error(`Error in Support AI: ${error.message}`);
      const errorMsg = "দুঃখিত, এই মুহূর্তে সার্ভিস সাড়া দিচ্ছে না। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
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
}
