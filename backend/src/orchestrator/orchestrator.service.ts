import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { InboxService } from '../inbox/inbox.service';
import { BillingService } from '../billing/billing.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QuotaService } from '../tenants/quota.service';
import { ActivityLogService } from '../inbox/activity-log.service';
import { InboxGateway } from '../inbox/inbox.gateway';
import { AiCacheService } from '../ai/ai-cache.service';
import * as path from 'path';
import * as fs from 'fs';

export interface StructuredAiClassification {
  replyText: string;
  intent: 'general' | 'order_intent' | 'order_confirmation' | 'support_needed' | 'product_lookup' | 'property_inquiry' | 'room_booking_inquiry';
  orderProposal?: { productNameGuess: string; quantity: number }[];
  imageProductDescription?: string;
  supportSignal?: boolean;
  supportReason?: 'general' | 'complaint' | 'refund_return' | 'delivery_issue';
  matchedTags?: string[];
  interestedPropertyName?: string; // Property mode: which property customer mentioned
  interestedRoomName?: string; // Hospitality mode: which hotel room/suite customer mentioned
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private aiCacheService: AiCacheService,
    private billingService: BillingService,
    private ordersService: OrdersService,
    private notificationsService: NotificationsService,
    private quotaService: QuotaService,
    private activityLogService: ActivityLogService,
    @Inject(forwardRef(() => InboxService))
    private inboxService: InboxService,
    @Inject(forwardRef(() => InboxGateway))
    private inboxGateway: InboxGateway
  ) {}

  private assertBelongsToTenant(record: { tenantId: string }, tenantId: string, entityName: string) {
    if (!record || record.tenantId !== tenantId) {
      throw new Error(`Security Violation: ${entityName} does not belong to tenant ${tenantId}`);
    }
  }

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
        return;
      }

      const tenantId = message.conversation.tenantId;
      this.assertBelongsToTenant(message.conversation, tenantId, 'Conversation');

      if (message.conversation.channelConnection && (message.conversation.channelConnection.status === 'inactive' || message.conversation.channelConnection.isAiAutoReplyEnabled === false)) {
        this.logger.debug(`AI Auto-Reply is disabled or channel is inactive for connection ${message.conversation.channelConnection.id}. Skipping.`);
        return;
      }

      if (message.conversation.channel === 'website') {
        const widget = await this.prisma.websiteWidget.findFirst({
          where: { tenantId, type: 'LIVE_CHAT' }
        });
        if (!widget || widget.isActive === false || widget.isAiAutoReplyEnabled === false) {
          this.logger.debug(`AI Auto-Reply is disabled or website widget is inactive. Skipping.`);
          return;
        }
      }

      if (message.conversation.isAiEnabled === false || (message.conversation as any).isBlocked || (message.conversation.contact as any)?.isBlocked) {
        this.logger.debug(`AI Auto-Reply is disabled or blocked for conversation ${message.conversation.id}. Skipping.`);
        return;
      }

      // Never process AI auto-reply for group conversations
      const externalContactId = message.conversation.contact?.externalContactId || '';
      if (externalContactId.includes('@g.us')) {
        this.logger.debug(`Group conversation detected (${externalContactId}). Skipping AI auto-reply.`);
        return;
      }

      // 2. Fetch AI Assistant & Assistant Tools
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId },
        include: {
          tools: true,
          tenant: { select: { customAiConfigId: true } }
        }
      });

      if (!assistant || !assistant.isActive || assistant.routingMode === 'custom_only') {
        return;
      }

      this.assertBelongsToTenant(assistant, tenantId, 'AiAssistant');

      // Resolve Modes from BusinessNature
      const tenantRecord = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessNature: true } });
      let isPropertyMode = false;
      let isHospitalityMode = false;
      if (tenantRecord?.businessNature) {
        const businessNature = await this.prisma.businessNature.findFirst({
          where: { name: tenantRecord.businessNature }
        });
        isPropertyMode = businessNature?.isPropertyMode ?? false;
        isHospitalityMode = businessNature?.isHospitalityMode ?? false;
      }

      // Map tool states
      const toolMap: Record<string, { isEnabled: boolean; configJson: any }> = {};
      (assistant.tools || []).forEach(t => {
        toolMap[t.toolType] = { isEnabled: t.isEnabled, configJson: t.configJson };
      });

      // Check plan feature gating for each tool
      const planOrderPlacement = await this.quotaService.checkFeature(tenantId, 'ai_tool_order_placement').catch(() => false);
      const planImageReading = await this.quotaService.checkFeature(tenantId, 'ai_tool_image_reading').catch(() => false);
      const planSupportDetection = await this.quotaService.checkFeature(tenantId, 'ai_tool_support_detection').catch(() => false);
      const planProductMatching = await this.quotaService.checkFeature(tenantId, 'ai_tool_product_matching').catch(() => false);

      // Property/Hospitality mode: order placement is always disabled to prevent AI from creating orders for inquiries/bookings
      const isSpecialModeActive = isPropertyMode || isHospitalityMode;
      const isOrderPlacementActive = !isSpecialModeActive &&
        (toolMap['order_placement']?.isEnabled ?? assistant.aiOrderEnabled) && planOrderPlacement;
      const isImageReadingActive = (toolMap['image_reading']?.isEnabled ?? true) && planImageReading;
      const isSupportDetectionActive = (toolMap['support_detection']?.isEnabled ?? false) && planSupportDetection;
      const isProductMatchingActive = !isSpecialModeActive && (toolMap['product_matching']?.isEnabled ?? false) && planProductMatching;

      // Resolve AI Config
      const customAiConfigId = assistant.tenant?.customAiConfigId || undefined;
      let targetConfig: any = null;
      if (customAiConfigId) {
        targetConfig = await this.prisma.aiConfig.findUnique({ where: { id: customAiConfigId } });
      } else {
        targetConfig = await this.prisma.aiConfig.findFirst({ where: { isActive: true } });
      }

      const isVisionSupported = this.aiService.isVisionSupported(targetConfig?.provider, targetConfig?.modelName);
      const isImageMessage = message.type === 'image';
      
      // Vision only runs if vision model supported AND image_reading tool is active
      const canRunVision = isImageMessage && isVisionSupported && isImageReadingActive;
      const creditsNeeded = canRunVision ? 5 : 1;

      // 3. Check AI Quota
      const quotas = await this.billingService.getTenantQuotas(tenantId);
      const usage = await this.prisma.aiUsageLog.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _count: true
      });

      if (usage._count + creditsNeeded > quotas.aiQuota) {
        this.logger.warn(`Tenant ${tenantId} has insufficient AI quota.`);
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
        this.logger.warn(`Tenant ${tenantId} exceeded global Message quota.`);
        return;
      }

      // Extract image path if image
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

      const actualImagePaths = canRunVision && imagePathsToPass.length > 0 ? imagePathsToPass : undefined;

      // 4. Stage A — Structured Context & Prompt Building
      const prompt = await this.buildContextPrompt(message.conversationId, assistant, {
        isImage: canRunVision && imagePathsToPass.length > 0,
        caption: userCaption,
        isOrderPlacementActive,
        isSupportDetectionActive,
        isPropertyMode,
        isHospitalityMode,
      });

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

      // Build static context checksum & get/create prompt cache
      let activeCacheKey: string | undefined = undefined;
      try {
        const qnaItems = await this.prisma.qnAKnowledgeBase.findMany({
          where: { tenantId, isActive: true },
          take: 20
        });
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const freshDocs = await this.prisma.knowledgeDocument.findMany({
          where: { tenantId, status: 'completed', uploadedAt: { gte: sixtyDaysAgo } },
          include: { chunks: { take: 10 } },
          take: 5
        });
        const labels = await this.prisma.label.findMany({ where: { tenantId } });

        const checksum = this.aiCacheService.computeChecksum(assistant.systemPrompt || '', freshDocs, qnaItems, labels);
        const knowledgeContext = [
          ...qnaItems.map(q => `Q: ${q.question}\nA: ${q.answer}`),
          ...freshDocs.flatMap(d => d.chunks.map(c => c.content))
        ].join('\n');

        const activeProvider = targetConfig?.provider || assistant.provider || 'gemini';
        const activeModelName = targetConfig?.modelName || assistant.modelName || 'gemini-1.5-flash';
        const activeApiKey = targetConfig?.apiKey;

        const cacheResult = await this.aiCacheService.getOrCreateCache({
          tenantId,
          provider: activeProvider,
          modelName: activeModelName,
          apiKey: activeApiKey,
          systemPrompt: assistant.systemPrompt || '',
          knowledgeContext,
          checksum
        });

        if (cacheResult.isCached && cacheResult.cacheKey) {
          activeCacheKey = cacheResult.cacheKey;
        }
      } catch (cacheErr: any) {
        this.logger.debug(`Prompt caching skipped or failed: ${cacheErr.message}`);
      }

      // Call LLM
      const rawLlmOutput = await this.aiService.generateCompletion(fullPrompt, customAiConfigId, actualImagePaths, activeCacheKey);

      if (!rawLlmOutput || rawLlmOutput.trim() === '') {
        return;
      }

      // Parse JSON Stage A Output
      const classification = this.parseClassificationOutput(rawLlmOutput);

      // 5. Stage B — Deterministic Backend Handlers

      // Handler 1: Order Placement Flow / Property Inquiry / Hospitality Booking
      let finalReplyText = classification.replyText;

      if (isOrderPlacementActive) {
        const orderResult = await this.handleOrderPlacement(tenantId, message.conversation, classification, message.conversationId, userText);
        if (orderResult?.overrideReplyText) {
          finalReplyText = orderResult.overrideReplyText;
        }
      } else if (isPropertyMode && classification.intent === 'property_inquiry') {
        await this.handlePropertyInquiry(tenantId, message.conversation, message.conversationId, classification.interestedPropertyName, userText);
      } else if (isHospitalityMode && classification.intent === 'room_booking_inquiry') {
        await this.handleRoomBookingInquiry(tenantId, message.conversation, message.conversationId, classification.interestedRoomName, userText);
      }

      // Handler 2: Support Detection & Handover
      if (isSupportDetectionActive && classification.supportSignal) {
        const lowerUserText = userText.trim().toLowerCase();
        const genericGreetings = ['hi', 'hello', 'hey', 'salam', 'assalamu alaikum', 'hola', 'test', '.gitignore', 'hlw', 'hlo'];
        const isGenericGreeting = genericGreetings.includes(lowerUserText) || lowerUserText.length <= 3;

        if (!isGenericGreeting) {
          await this.handleSupportDetection(tenantId, message.conversation, classification.supportReason || 'general');
        } else {
          this.logger.log(`Skipping support detection for generic greeting/short message: "${userText}"`);
        }
      }

      // Handler 3: Product Photo Matching
      if (isProductMatchingActive) {
        const minConf = toolMap['product_matching']?.configJson?.minMatchConfidence ?? 0.6;
        await this.handleProductMatching(tenantId, message.conversationId, classification, minConf);
      }

      // Handler 4: Auto-Tagging / Conversation Labels Sync
      if (classification.matchedTags && classification.matchedTags.length > 0) {
        const matchingLabels = await this.prisma.label.findMany({
          where: {
            tenantId,
            name: { in: classification.matchedTags },
            isActive: true
          }
        });

        for (const label of matchingLabels) {
          const exists = await this.prisma.conversationLabel.findUnique({
            where: {
              conversationId_labelId: {
                conversationId: message.conversationId,
                labelId: label.id
              }
            }
          });
          if (!exists) {
            await this.prisma.conversationLabel.create({
              data: {
                conversationId: message.conversationId,
                labelId: label.id
              }
            });
            await this.activityLogService.record({
              tenantId,
              conversationId: message.conversationId,
              contactId: message.conversation.contactId,
              type: 'TAG_ADDED',
              actorUserId: undefined,
              metadataJson: { labelId: label.id, autoMatched: true }
            });
          }
        }
      }

      // Handler 5: Property Inquiry → Lead Intake (Property Mode only)
      if (isPropertyMode && classification.intent === 'property_inquiry') {
        await this.handlePropertyInquiry(
          tenantId,
          message.conversation,
          message.conversationId,
          classification.interestedPropertyName,
          userText
        );
      }

      // 6. Response Dispatch
      if (finalReplyText && finalReplyText.trim() !== '') {
        await this.inboxService.saveOutboundMessage(tenantId, message.conversationId, finalReplyText, 'text', undefined, assistant.id);
      }

      // 7. Log AI Usage Credits
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
      this.logger.error(`Error orchestrating message ${messageId}: ${error.message}`, error.stack);
    }
  }

  private parseClassificationOutput(rawText: string): StructuredAiClassification {
    try {
      // Clean JSON markers if present
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);

      if (typeof parsed.replyText === 'string') {
        return {
          replyText: parsed.replyText,
          intent: ['general', 'order_intent', 'order_confirmation', 'support_needed', 'product_lookup', 'property_inquiry', 'room_booking_inquiry'].includes(parsed.intent)
            ? parsed.intent
            : 'general',
          orderProposal: Array.isArray(parsed.orderProposal) ? parsed.orderProposal : undefined,
          imageProductDescription: parsed.imageProductDescription,
          supportSignal: !!parsed.supportSignal,
          supportReason: ['general', 'complaint', 'refund_return', 'delivery_issue'].includes(parsed.supportReason)
            ? parsed.supportReason
            : 'general',
          matchedTags: Array.isArray(parsed.matchedTags) ? parsed.matchedTags.map(String) : [],
          interestedPropertyName: typeof parsed.interestedPropertyName === 'string' ? parsed.interestedPropertyName : undefined,
          interestedRoomName: typeof parsed.interestedRoomName === 'string' ? parsed.interestedRoomName : undefined,
        };
      }
    } catch (e) {
      // Fallback: If JSON parsing fails, use raw text directly as plain conversation
    }

    return {
      replyText: rawText,
      intent: 'general',
      supportSignal: false
    };
  }

  private async handleOrderPlacement(
    tenantId: string,
    conversation: any,
    classification: StructuredAiClassification,
    conversationId: string,
    userText?: string
  ): Promise<{ overrideReplyText?: string } | void> {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');

    // Path A: Customer confirms an existing order proposal
    if (classification.intent === 'order_confirmation' && conversation.pendingOrderProposal) {
      const proposal = conversation.pendingOrderProposal as any;
      
      // Check expiration (30 minutes expiry)
      const isExpired = proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now();
      if (!isExpired && proposal.items && Array.isArray(proposal.items) && proposal.items.length > 0) {
        
        // Strict Hard Confirmation Ritual Validation
        const rawUserText = (userText || '').trim().toLowerCase();
        const hardConfirmations = ['confirm', 'yes place order', 'confirm order', 'হ্যাঁ অর্ডার কনফার্ম', 'অর্ডার কনফার্ম', 'অর্ডার নিশ্চিত করুন'];
        const isHardConfirmed = hardConfirmations.some(kw => rawUserText.includes(kw));

        // Soft consent (e.g. 'sure', 'okay', 'ঠিক আছে', 'achha', 'hmm') requires explicit confirmation
        if (!isHardConfirmed) {
          this.logger.log(`Soft consent detected for conversation ${conversationId} ("${userText}"). Requiring explicit confirmation.`);
          return {
            overrideReplyText: `আপনার অর্ডারটি চূড়ান্ত করতে অনুগ্রহ করে 'CONFIRM' অথবা 'YES PLACE ORDER' লিখে মেসেজ করুন।\n\nTo complete your order, please reply with 'CONFIRM' or 'YES PLACE ORDER'.`
          };
        }

        // Re-validate price and stock from live DB
        const validatedItems: { productId: string; quantity: number; priceAtTime: number }[] = [];
        let grandTotal = 0;

        for (const item of proposal.items) {
          const liveProduct = await this.prisma.product.findFirst({
            where: { id: item.productId, tenantId, isActive: true }
          });
          if (liveProduct) {
            const price = Number(liveProduct.price);
            validatedItems.push({
              productId: liveProduct.id,
              quantity: item.quantity || 1,
              priceAtTime: price
            });
            grandTotal += price * (item.quantity || 1);
          }
        }

        if (validatedItems.length > 0) {
          // Create real order
          const createdOrder = await this.ordersService.createOrder(tenantId, {
            contactId: conversation.contactId,
            conversationId: conversation.id,
            items: validatedItems,
            notes: 'Placed via AI Assistant'
          });

          // Update Order provenance
          await (this.prisma as any).order.update({
            where: { id: createdOrder.id },
            data: { createdBy: 'ai' }
          });

          // Clear proposal & set hasOrderRequest
          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: {
              pendingOrderProposal: null,
              hasOrderRequest: true
            }
          });

          // Activity Log
          await this.activityLogService.record({
            tenantId,
            conversationId,
            contactId: conversation.contactId,
            type: 'ORDER_CREATED',
            metadataJson: { orderId: createdOrder.id, source: 'ai', totalAmount: grandTotal }
          });

          return {
            overrideReplyText: `ধন্যবাদ! আপনার অর্ডারটি নিশ্চিত করা হয়েছে (অর্ডার নম্বর: #${createdOrder.id.slice(0, 8)})। মোট মূল্য: BDT ${grandTotal}।\n\nThank you! Your order has been placed (Order #${createdOrder.id.slice(0, 8)}). Total: BDT ${grandTotal}.`
          };
        }
      }

      // Proposal expired or invalid
      await (this.prisma as any).conversation.update({
        where: { id: conversationId },
        data: { pendingOrderProposal: null }
      });
    }

    // Path B: New order intent proposed by customer
    if (classification.intent === 'order_intent' && classification.orderProposal && classification.orderProposal.length > 0) {
      const proposalItems: { productId: string; name: string; price: number; quantity: number }[] = [];
      let totalAmount = 0;

      for (const item of classification.orderProposal) {
        if (!item.productNameGuess) continue;
        
        // Fuzzy search tenant products
        const matchedProduct = await this.prisma.product.findFirst({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { name: { contains: item.productNameGuess, mode: 'insensitive' } },
              { sku: { contains: item.productNameGuess, mode: 'insensitive' } }
            ]
          }
        });

        if (matchedProduct) {
          const price = Number(matchedProduct.price);
          const qty = item.quantity || 1;
          proposalItems.push({
            productId: matchedProduct.id,
            name: matchedProduct.name,
            price,
            quantity: qty
          });
          totalAmount += price * qty;
        }
      }

      if (proposalItems.length > 0) {
        const proposalJson = {
          items: proposalItems,
          totalAmount,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
        };

        await (this.prisma as any).conversation.update({
          where: { id: conversationId },
          data: { pendingOrderProposal: proposalJson }
        });

        const itemsListStr = proposalItems.map(i => `${i.quantity}x ${i.name} (${i.price} BDT)`).join(', ');
        return {
          overrideReplyText: `আমি আপনার অর্ডার প্রপোজাল তৈরি করেছি:\n📦 ${itemsListStr}\n💰 মোট: BDT ${totalAmount}\n\nঅর্ডারটি নিশ্চিত করতে 'CONFIRM' অথবা 'YES PLACE ORDER' লিখে রিপ্লাই দিন।\n\nShall I place this order for ${itemsListStr}? Total: BDT ${totalAmount}. Reply 'CONFIRM' or 'YES PLACE ORDER' to confirm.`
        };
      }
    }
  }

  private async handleSupportDetection(tenantId: string, conversation: any, reason: string) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');

    await (this.prisma as any).conversation.update({
      where: { id: conversation.id },
      data: { requiresFollowUp: true }
    });

    await this.activityLogService.record({
      tenantId,
      conversationId: conversation.id,
      contactId: conversation.contactId,
      type: 'AI_HANDOVER',
      metadataJson: { reason }
    });

    // Notify tenant admins
    await this.notificationsService.createNotificationForTenantAdmins(
      tenantId,
      'Support Required',
      `Customer ${conversation.contact.name || 'User'} needs assistance (${reason}).`,
      'inbox'
    ).catch(() => {});

    // Broadcast socket event
    this.inboxGateway.broadcastToTenant(tenantId, 'conversation:followUpFlagged', {
      conversationId: conversation.id,
      requiresFollowUp: true
    });
  }

  private async handleProductMatching(
    tenantId: string,
    conversationId: string,
    classification: StructuredAiClassification,
    minConfidence: number = 0.8
  ) {
    const searchQuery = classification.imageProductDescription;
    if (!searchQuery && classification.intent !== 'product_lookup') return;

    const queryStr = searchQuery || classification.replyText;
    if (!queryStr || queryStr.length < 3) return;

    // Search tenant product catalog for photo
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        imageUrl: { not: null }
      }
    });

    if (products.length === 0) return;

    const qTokens = queryStr.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (qTokens.length === 0) return;

    let bestMatch: any = null;
    let bestScore = 0;

    for (const p of products) {
      const pText = `${p.name} ${p.description || ''}`.toLowerCase();
      const pTokens = pText.split(/\s+/).filter(t => t.length > 2);

      let matches = 0;
      for (const q of qTokens) {
        if (pTokens.some(pt => pt.includes(q) || q.includes(pt))) {
          matches++;
        }
      }

      const score = matches / qTokens.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = p;
      }
    }

    if (bestMatch && bestMatch.imageUrl) {
      if (bestScore >= minConfidence) {
        // High confidence match (>= 80%)
        await this.inboxService.saveOutboundMessage(
          tenantId,
          conversationId,
          JSON.stringify({
            mediaUrl: bestMatch.imageUrl,
            body: `📸 ${bestMatch.name} — BDT ${bestMatch.price}`
          }),
          'image'
        );

        await this.activityLogService.record({
          tenantId,
          conversationId,
          type: 'PRODUCT_MATCH_SENT',
          metadataJson: { productId: bestMatch.id, name: bestMatch.name, confidenceScore: bestScore }
        });
      } else if (bestScore >= 0.6 && bestScore < minConfidence) {
        // Moderate confidence (60% - 79%): Clarifying question fallback
        await this.inboxService.saveOutboundMessage(
          tenantId,
          conversationId,
          `আপনি কি '${bestMatch.name}' প্রোডাক্টটি খুঁজছেন? (মূল্য: BDT ${bestMatch.price})\n\nAre you looking for '${bestMatch.name}' (Price: BDT ${bestMatch.price})? Please confirm so I can share details.`
        );
      }
    }
  }

  private async buildContextPrompt(
    conversationId: string,
    assistant: any,
    options?: { isImage: boolean; caption: string; isOrderPlacementActive: boolean; isSupportDetectionActive: boolean; isPropertyMode?: boolean; isHospitalityMode?: boolean }
  ): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: { include: { stage: true } }, tenant: true }
    });

    if (!conversation) return assistant.systemPrompt || '';

    const products = await this.prisma.product.findMany({
      where: { tenantId: conversation.tenantId, isActive: true },
      take: 50
    });

    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Fetch tenant Q&A knowledge base
    const qnaItems = await this.prisma.qnAKnowledgeBase.findMany({
      where: { tenantId: conversation.tenantId, isActive: true },
      take: 20
    });

    // 60-Day Freshness Document Validation: Filter out knowledge older than 60 days
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const freshDocs = await this.prisma.knowledgeDocument.findMany({
      where: {
        tenantId: conversation.tenantId,
        status: 'completed',
        uploadedAt: { gte: sixtyDaysAgo }
      },
      include: {
        chunks: { take: 10 }
      },
      take: 5
    });

    let prompt = `You are a helpful AI assistant for ${conversation.tenant.businessName}.\n`;

    prompt += `\n=== MANDATORY ANTI-HALLUCINATION GUARDRAILS ===\n`;
    prompt += `1. ALWAYS use Q&A/Documents first as the source of truth.\n`;
    prompt += `2. NEVER invent products, features, or prices.\n`;
    prompt += `3. Never promise discounts or refunds without strict authorization.\n`;
    prompt += `4. If uncertain, explicitly state that you do not know and suggest human handoff.\n`;
    
    let systemPrompt = assistant.systemPrompt || '';
    if (assistant.agentName) {
      systemPrompt = `Your name is ${assistant.agentName}. ${systemPrompt}`;
    }

    if (systemPrompt) {
      prompt += `\nYour Core Instructions:\n${systemPrompt}\n`;
    }

    if (options?.isImage) {
      prompt += `\n--- IMAGE ANALYSIS INSTRUCTIONS ---\n`;
      prompt += `The customer sent an image. Examine it carefully and describe the product seen in 'imageProductDescription'.\n`;
      if (options.caption) {
        prompt += `Caption: "${options.caption}"\n`;
      }
    }

    prompt += `\n--- CUSTOMER INFO ---\n`;
    prompt += `Name: ${conversation.contact.name}\n`;
    if (conversation.contact.phone) prompt += `Phone: ${conversation.contact.phone}\n`;
    if (conversation.contact.email) prompt += `Email: ${conversation.contact.email}\n`;
    prompt += `Stage: ${conversation.contact.stage?.name || 'Lead'}\n`;

    if (conversation.pendingOrderProposal) {
      prompt += `\n--- ACTIVE PENDING ORDER PROPOSAL ---\n`;
      prompt += `${JSON.stringify(conversation.pendingOrderProposal)}\n`;
    }

    if (qnaItems.length > 0) {
      prompt += `\n--- OFFICIAL BUSINESS Q&A (SOURCE OF TRUTH) ---\n`;
      qnaItems.forEach(q => {
        if (q.answer && q.answer.trim()) {
          prompt += `Q: ${q.question}\nA: ${q.answer}\n`;
        }
      });
    }

    if (freshDocs.length > 0) {
      prompt += `\n--- VERIFIED KNOWLEDGE DOCUMENTS (FRESH <60 DAYS) ---\n`;
      freshDocs.forEach(doc => {
        prompt += `Document: ${doc.filename} (Uploaded: ${doc.uploadedAt.toISOString().split('T')[0]})\n`;
        doc.chunks.forEach(c => {
          prompt += `Content: ${c.content}\n`;
        });
      });
    }

    // ── Catalog / Listings context (branched by mode) ──────────────────────
    if (options?.isPropertyMode) {
      // Property mode: lightweight listing with key property attributes
      if (products.length > 0) {
        prompt += `\n--- PROPERTY LISTINGS (Source of Truth for Available Properties) ---\n`;
        prompt += `IMPORTANT: You are a REAL ESTATE assistant. Do NOT take orders. Help customers find suitable properties and collect their interest.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const listingType = (p as any).listingType ? `[${((p as any).listingType as string).toUpperCase()}]` : '';
          const location = (p as any).location || '';
          const area = attrs.area || attrs['Area (sqft)'] || '';
          const bedrooms = attrs.bedrooms || attrs['Bedrooms'] || '';
          const bathrooms = attrs.bathrooms || attrs['Bathrooms'] || '';
          prompt += `- ${listingType} ${p.name}`;
          if (location) prompt += ` | 📍 ${location}`;
          if (area) prompt += ` | 📐 ${area} sqft`;
          if (bedrooms) prompt += ` | 🛏 ${bedrooms} BR`;
          if (bathrooms) prompt += ` | 🚿 ${bathrooms} Bath`;
          prompt += ` | 💰 BDT ${p.price.toString()}\n`;
        });
      }
    } else if (options?.isHospitalityMode) {
      // Hospitality mode: hotel rooms & suites with capacity & amenities
      if (products.length > 0) {
        prompt += `\n--- HOTEL ROOMS & SUITES (Source of Truth for Available Rooms) ---\n`;
        prompt += `IMPORTANT: You are a HOTEL & HOSPITALITY reservation assistant. Do NOT create product orders. Help guests check room options, amenities, rates, and collect booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const roomType = attrs.roomType ? `[${String(attrs.roomType).toUpperCase()}]` : '';
          const capacity = attrs.capacity || attrs.guests || '';
          const bedType = attrs.bedType || '';
          const amenities = Array.isArray(attrs.amenities) ? attrs.amenities.join(', ') : (attrs.amenities || '');
          prompt += `- ${roomType} ${p.name}`;
          if (capacity) prompt += ` | 👥 Max ${capacity} Guests`;
          if (bedType) prompt += ` | 🛏 ${bedType}`;
          if (amenities) prompt += ` | ✨ ${amenities}`;
          prompt += ` | 💰 BDT ${p.price.toString()}/night\n`;
        });
      }
    } else {
      // eCommerce mode: standard product catalog
      if (products.length > 0) {
        prompt += `\n--- PRODUCT CATALOG ---\n`;
        products.forEach(p => {
          prompt += `- ${p.name}: BDT ${p.price.toString()} (SKU: ${p.sku || 'N/A'})\n`;
        });
      }
    }

    prompt += `\n--- CONVERSATION HISTORY ---\n`;
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

    const activeTags = await this.prisma.label.findMany({
      where: { tenantId: conversation.tenantId, isActive: true }
    });

    if (activeTags.length > 0) {
      prompt += `\n--- CONVERSATION TAGS RULES ---\n`;
      prompt += `The following tags are active. If the customer's query matches any of these tag rules, you MUST apply its instruction/prompt to compose your response and return the matched tag name inside the "matchedTags" JSON array. Ignore any tags not listed below:\n`;
      activeTags.forEach(tag => {
        if (tag.aiPrompt) {
          prompt += `- Tag: "${tag.name}"\n  Rule/Instruction: "${tag.aiPrompt}"\n`;
        }
      });
    }

    prompt += `\n--- MANDATORY CLASSIFICATION & EVENT RULES ---\n`;
    if (options?.isSupportDetectionActive) {
      prompt += `1. SUPPORT DETECTION IS ENABLED:\n`;
      prompt += `   - Set "supportSignal": true ONLY IF the customer explicitly asks for human support, human agent, files a serious complaint, or requests a refund, return, or order cancellation.\n`;
      prompt += `   - CRITICAL: MUST set "supportSignal": false for simple greetings ("hi", "hello", "hey", "salam"), general questions, price inquiries, product browsing, or standard messages.\n`;
    } else {
      prompt += `1. SUPPORT DETECTION IS DISABLED: You MUST ALWAYS set "supportSignal": false.\n`;
    }

    if (options?.isPropertyMode) {
      prompt += `2. PROPERTY INQUIRY MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any orders.\n`;
      prompt += `   - If the customer shows interest in a specific property (wants to visit, wants more info, wants to buy/rent), set "intent": "property_inquiry".\n`;
      prompt += `   - Set "interestedPropertyName" to the property name the customer is interested in.\n`;
      prompt += `   - For general browsing or questions, use "intent": "general".\n`;
    } else if (options?.isHospitalityMode) {
      prompt += `2. HOTEL & HOSPITALITY MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any product orders.\n`;
      prompt += `   - If the guest wants to book or reserve a room, check-in dates, or room info, set "intent": "room_booking_inquiry".\n`;
      prompt += `   - Set "interestedRoomName" to the room/suite name the guest is interested in.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (!options?.isOrderPlacementActive) {
      prompt += `2. ORDER PLACEMENT IS DISABLED: Set "intent": "general" or "product_lookup" and do NOT generate order proposals.\n`;
    }

    prompt += `\n--- MANDATORY STRUCTURED JSON RESPONSE OUTPUT FORMAT ---\n`;
    prompt += `You MUST output a single valid JSON object with NO preamble. The JSON schema must strictly follow:\n`;
    prompt += `{\n`;
    prompt += `  "replyText": "your friendly response to customer",\n`;
    if (options?.isPropertyMode) {
      prompt += `  "intent": "general | property_inquiry | support_needed | product_lookup",\n`;
      prompt += `  "interestedPropertyName": "name of property customer is interested in (or empty string)",\n`;
    } else if (options?.isHospitalityMode) {
      prompt += `  "intent": "general | room_booking_inquiry | support_needed | product_lookup",\n`;
      prompt += `  "interestedRoomName": "name of hotel room/suite guest is interested in (or empty string)",\n`;
    } else {
      prompt += `  "intent": "general | order_intent | order_confirmation | support_needed | product_lookup",\n`;
      prompt += `  "orderProposal": [ { "productNameGuess": "Product Name", "quantity": 1 } ],\n`;
    }
    prompt += `  "imageProductDescription": "short description of product seen in image",\n`;
    prompt += `  "supportSignal": false,\n`;
    prompt += `  "supportReason": "general | complaint | refund_return | delivery_issue",\n`;
    prompt += `  "matchedTags": ["tag name 1", "tag name 2"]\n`;
    prompt += `}\n`;

    return prompt;
  }

  // ── Property Inquiry Handler ─────────────────────────────────────────────
  // Called when AI detects a property_inquiry intent in Property Mode.
  // Moves contact to 'Intake' Kanban stage and records a ContactNote.
  private async handlePropertyInquiry(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedPropertyName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Intake' stage
      let intakeStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Intake' }
      });
      if (!intakeStage) {
        intakeStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Intake', color: '#8b5cf6', order: 0 }
        });
      }

      // 2. Move contact to Intake stage (only if not already in a later stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });
      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: intakeStage.id }
        });
      }

      // 3. Record ContactNote with inquiry details
      const noteContent = [
        '[AI Property Inquiry]',
        interestedPropertyName ? `Property: ${interestedPropertyName}` : '',
        `Customer message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'PROPERTY_INQUIRY',
        metadataJson: { propertyName: interestedPropertyName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Property Inquiry',
        `${contact?.name || 'A customer'} is interested in${interestedPropertyName ? ' "' + interestedPropertyName + '"' : ' a property'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Property inquiry recorded for contact ${contactId}, property: ${interestedPropertyName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handlePropertyInquiry failed: ${err.message}`);
    }
  }

  // ── Room Booking Inquiry Handler (Hospitality Mode) ──────────────────────
  // Called when AI detects a room_booking_inquiry intent in Hospitality Mode.
  // Moves contact to 'Intake' Kanban stage and records a ContactNote.
  private async handleRoomBookingInquiry(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedRoomName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Intake' stage
      let intakeStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Intake' }
      });
      if (!intakeStage) {
        intakeStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Intake', color: '#8b5cf6', order: 0 }
        });
      }

      // 2. Move contact to Intake stage
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });
      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: intakeStage.id }
        });
      }

      // 3. Record ContactNote with room booking inquiry details
      const noteContent = [
        '[AI Hotel Room Reservation Inquiry]',
        interestedRoomName ? `Room: ${interestedRoomName}` : '',
        `Guest message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'ROOM_BOOKING_INQUIRY',
        metadataJson: { roomName: interestedRoomName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Hotel Room Reservation Inquiry',
        `${contact?.name || 'A guest'} is inquiring about${interestedRoomName ? ' "' + interestedRoomName + '"' : ' room booking'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Room booking inquiry recorded for contact ${contactId}, room: ${interestedRoomName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleRoomBookingInquiry failed: ${err.message}`);
    }
  }
}
