import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InboxService } from '../inbox/inbox.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private billingService: BillingService,
    @Inject(forwardRef(() => InboxService))
    private inboxService: InboxService
  ) {}

  async processMessage(messageId: string) {
    try {
      // 1. Fetch message and relations
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: { contact: true }
          }
        }
      });

      if (!message || message.direction !== 'inbound' || message.type !== 'text') {
        return; // Only process inbound text messages for now
      }

      const tenantId = message.conversation.tenantId;

      // 2. Check AI Assistant and Routing Mode
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId }
      });

      if (!assistant || !assistant.isActive || assistant.routingMode === 'custom_only') {
        return; // Tenant doesn't use the system AI Orchestrator or AI is disabled
      }

      if (message.conversation.assignedAgentId && !assistant.replyWhenAssigned) {
        return; // AI is configured not to reply when a human agent is assigned
      }

      // 3. Check AI Quota
      const quotas = await this.billingService.getTenantQuotas(tenantId);
      const usage = await this.prisma.aiUsageLog.aggregate({
        where: { 
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // Start of month
          }
        },
        _count: true
      });

      if (usage._count >= quotas.aiQuota) {
        this.logger.warn(`Tenant ${tenantId} exceeded AI quota. Message ${messageId} ignored by AI.`);
        return; 
      }

      // Check Global Message Quota
      const messagesUsed = await this.prisma.message.count({
        where: {
          conversation: { tenantId },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      });

      if (messagesUsed >= quotas.messageQuota) {
        this.logger.warn(`Tenant ${tenantId} exceeded global Message quota. Message ${messageId} ignored by AI.`);
        return;
      }

      // 4. Gather Context
      const prompt = await this.buildContextPrompt(message.conversationId, assistant.systemPrompt || '');

      // 5. LLM Execution
      // Extract the raw text from the message content
      let userText = '';
      if (typeof message.content === 'object' && message.content !== null) {
        userText = (message.content as any).text || JSON.stringify(message.content);
      } else {
        userText = String(message.content);
      }

      // We need to send the full system prompt + the latest user message
      // Actually, buildContextPrompt should format the conversation history as well.
      const fullPrompt = `${prompt}\n\nCustomer: ${userText}`;

      // Call AiService (using the tenant's AI config or platform config if BYOK not used/allowed)
      // For MVP, we just use the platform default or the BYOK logic inside AiService
      const replyText = await this.aiService.generateCompletion(fullPrompt);

      if (!replyText || replyText.trim() === '') {
        return;
      }

      // 6. Action / Response Dispatch
      await this.inboxService.saveOutboundMessage(tenantId, message.conversationId, replyText, 'text');

      // 7. Log Usage
      await this.prisma.aiUsageLog.create({
        data: {
          tenantId,
          assistantId: assistant.id,
          tokensUsed: 0, // Estimate or fetch from AiService later
          costUsd: 0,
        }
      });

    } catch (error) {
      this.logger.error(`Error orchestrating message ${messageId}: ${error.message}`);
    }
  }

  private async buildContextPrompt(conversationId: string, baseSystemPrompt: string): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: { include: { stage: true } }, tenant: true }
    });

    if (!conversation) return baseSystemPrompt;

    // Fetch active products
    const products = await this.prisma.product.findMany({
      where: { tenantId: conversation.tenantId, isActive: true },
      take: 50 // Limit to avoid huge prompts
    });

    // Fetch conversation history (last 10 messages)
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    let prompt = `You are a helpful AI assistant for ${conversation.tenant.businessName}.\n`;
    if (baseSystemPrompt) {
      prompt += `\nYour Core Instructions:\n${baseSystemPrompt}\n`;
    }

    prompt += `\n--- CUSTOMER INFO ---\n`;
    prompt += `Name: ${conversation.contact.name}\n`;
    if (conversation.contact.phone) prompt += `Phone: ${conversation.contact.phone}\n`;
    if (conversation.contact.email) prompt += `Email: ${conversation.contact.email}\n`;
    prompt += `Stage: ${conversation.contact.stage?.name || 'Lead'}\n`;

    if (products.length > 0) {
      prompt += `\n--- PRODUCT CATALOG ---\n`;
      products.forEach(p => {
        prompt += `- ${p.name}: BDT ${p.price.toString()} (SKU: ${p.sku || 'N/A'})\n`;
      });
    }

    prompt += `\n--- CONVERSATION HISTORY ---\n`;
    // Reverse to chronological
    [...history].reverse().forEach(msg => {
      const sender = msg.direction === 'inbound' ? 'Customer' : 'Assistant';
      let text = '';
      if (typeof msg.content === 'object' && msg.content !== null) {
        text = (msg.content as any).text || '';
      } else {
        text = String(msg.content);
      }
      if (text) {
        prompt += `${sender}: ${text}\n`;
      }
    });

    prompt += `\nInstructions: Given the conversation history and context above, write the next 'Assistant:' response. Do not prefix your output with 'Assistant:', just write the message body directly.\n`;

    return prompt;
  }
}
