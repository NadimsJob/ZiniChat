import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InboxService } from '../inbox/inbox.service';
import { BillingService } from '../billing/billing.service';
import * as path from 'path';
import * as fs from 'fs';

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
            include: { contact: true, channelConnection: true }
          }
        }
      });

      if (!message || message.direction !== 'inbound' || (message.type !== 'text' && message.type !== 'image')) {
        return; // Only process inbound text or image messages
      }

      const tenantId = message.conversation.tenantId;

      if (message.conversation.channelConnection && message.conversation.channelConnection.isAiAutoReplyEnabled === false) {
        this.logger.debug(`AI Auto-Reply is disabled for connection ${message.conversation.channelConnection.id}. Skipping message ${messageId}.`);
        return; 
      }

      if (message.conversation.isAiEnabled === false) {
        this.logger.debug(`AI Auto-Reply is specifically disabled for conversation ${message.conversation.id}. Skipping.`);
        return;
      }

      // 2. Check AI Assistant, Tenant Settings, and Routing Mode
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId },
        include: { tenant: { select: { customAiConfigId: true } } }
      });

      if (!assistant || !assistant.isActive || assistant.routingMode === 'custom_only') {
        return; // Tenant doesn't use the system AI Orchestrator or AI is disabled
      }

      // Resolve AI Config to check Vision capability
      const customAiConfigId = assistant.tenant?.customAiConfigId || undefined;
      let targetConfig: any = null;
      if (customAiConfigId) {
        targetConfig = await this.prisma.aiConfig.findUnique({ where: { id: customAiConfigId } });
      } else {
        targetConfig = await this.prisma.aiConfig.findFirst({ where: { isActive: true } });
      }

      const isVisionSupported = this.aiService.isVisionSupported(targetConfig?.provider, targetConfig?.modelName);
      const isImageMessage = message.type === 'image';
      const creditsNeeded = (isImageMessage && isVisionSupported) ? 5 : 1;

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

      if (usage._count + creditsNeeded > quotas.aiQuota) {
        this.logger.warn(`Tenant ${tenantId} has insufficient AI quota (needs ${creditsNeeded}, has ${quotas.aiQuota - usage._count}). Message ${messageId} ignored by AI.`);
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

      // Extract image path and caption if image
      let imagePathsToPass: string[] = [];
      let userCaption = '';
      if (isImageMessage) {
        if (typeof message.content === 'object' && message.content !== null) {
          const cnt = message.content as any;
          userCaption = cnt.caption || cnt.text || '';
          const relPath = cnt.localUrl || cnt.localPath || cnt.mediaUrl || cnt.url || cnt.path;
          if (relPath) {
            const absolutePath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath.startsWith('/') ? relPath.substring(1) : relPath);
            if (fs.existsSync(absolutePath)) {
              imagePathsToPass.push(absolutePath);
            }
          }
        } else if (typeof message.content === 'string') {
          userCaption = message.content;
        }
      }

      // 4. Gather Context
      const prompt = await this.buildContextPrompt(message.conversationId, assistant, {
        isImage: isImageMessage && isVisionSupported && imagePathsToPass.length > 0,
        caption: userCaption
      });

      // 5. LLM Execution
      let userText = '';
      if (!isImageMessage) {
        if (typeof message.content === 'object' && message.content !== null) {
          userText = (message.content as any).text || JSON.stringify(message.content);
        } else {
          userText = String(message.content);
        }
      } else {
        userText = userCaption ? `[Image Sent] Caption: ${userCaption}` : '[Image Sent by Customer]';
      }

      const fullPrompt = `${prompt}\n\nCustomer: ${userText}`;

      const actualImagePaths = (isImageMessage && isVisionSupported && imagePathsToPass.length > 0) ? imagePathsToPass : undefined;
      const replyText = await this.aiService.generateCompletion(fullPrompt, customAiConfigId, actualImagePaths);

      if (!replyText || replyText.trim() === '') {
        return;
      }

      // 6. Action / Response Dispatch
      await this.inboxService.saveOutboundMessage(tenantId, message.conversationId, replyText, 'text');

      // 7. Log Usage (5 entries for Vision image analysis, 1 for standard text or text fallback)
      const logsToCreate = Array.from({ length: creditsNeeded }).map(() => ({
        tenantId,
        assistantId: assistant.id,
        tokensUsed: 0,
        costUsd: 0,
      }));

      await this.prisma.aiUsageLog.createMany({
        data: logsToCreate
      });

      this.logger.log(`AI Orchestration completed for message ${messageId}. Deducted ${creditsNeeded} credit(s).`);

    } catch (error) {
      this.logger.error(`Error orchestrating message ${messageId}: ${error.message}`);
    }
  }

  private async buildContextPrompt(
    conversationId: string, 
    assistant: any, 
    imageOptions?: { isImage: boolean; caption: string }
  ): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: { include: { stage: true } }, tenant: true }
    });

    if (!conversation) return assistant.systemPrompt || '';

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
    
    // Inject agent name if configured
    let systemPrompt = assistant.systemPrompt || '';
    if (assistant.agentName) {
      systemPrompt = `Your name is ${assistant.agentName}. ${systemPrompt}`;
    }

    if (systemPrompt) {
      prompt += `\nYour Core Instructions:\n${systemPrompt}\n`;
    }

    if (imageOptions?.isImage) {
      prompt += `\n--- IMPORTANT IMAGE ANALYSIS INSTRUCTIONS ---\n`;
      prompt += `The customer has sent an image in the conversation. Look closely at the image provided.\n`;
      prompt += `1. Identify the product or item shown in the image.\n`;
      prompt += `2. Cross-reference it with our PRODUCT CATALOG below to find the matching product name, price, and availability.\n`;
      prompt += `3. Give a helpful response confirming the product details, stock status, and price in BDT.\n`;
      if (imageOptions.caption) {
        prompt += `Customer's caption for image: "${imageOptions.caption}"\n`;
      }
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
        text = (msg.content as any).text || (msg.content as any).caption || '';
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
