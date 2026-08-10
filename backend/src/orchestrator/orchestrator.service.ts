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
  intent: 'general' | 'order_intent' | 'order_confirmation' | 'support_needed' | 'product_lookup' | 'property_inquiry' | 'room_booking_inquiry' | 'demo_request' | 'software_inquiry' | 'consultation_request' | 'appointment_request' | 'doctor_inquiry' | 'course_admission_inquiry' | 'course_inquiry' | 'bulk_rfq_inquiry' | 'rfq_inquiry' | 'shipment_quote_request' | 'shipment_tracking_inquiry' | 'logistics_inquiry';
  orderProposal?: { productNameGuess: string; quantity: number }[];
  imageProductDescription?: string;
  supportSignal?: boolean;
  supportReason?: 'general' | 'complaint' | 'refund_return' | 'delivery_issue';
  matchedTags?: string[];
  interestedPropertyName?: string; // Property mode: which property customer mentioned
  interestedRoomName?: string; // Hospitality mode: which hotel room/suite customer mentioned
  interestedSoftwareName?: string; // Software mode: which software plan/product customer mentioned
  interestedServiceName?: string; // Consulting mode: which service package customer mentioned
  interestedDoctorName?: string; // Healthcare mode: which doctor/specialist patient mentioned
  interestedCourseName?: string; // Education mode: which course/batch student mentioned
  interestedRfqProductName?: string; // Manufacturing mode: which wholesale product buyer inquired about
  interestedShipmentRoute?: string; // Logistics mode: which shipment route/fleet shipper inquired about
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
      let isTechSoftwareMode = false;
      let isFinancialServiceMode = false;
      let isHealthcareMode = false;
      let isEducationMode = false;
      let isManufacturingMode = false;
      let isLogisticsMode = false;
      if (tenantRecord?.businessNature) {
        const businessNature: any = await this.prisma.businessNature.findFirst({
          where: { name: tenantRecord.businessNature }
        });
        isPropertyMode = businessNature?.isPropertyMode ?? false;
        isHospitalityMode = businessNature?.isHospitalityMode ?? false;
        isTechSoftwareMode = businessNature?.isTechSoftwareMode ?? false;
        isFinancialServiceMode = businessNature?.isFinancialServiceMode ?? false;
        isHealthcareMode = businessNature?.isHealthcareMode ?? false;
        isEducationMode = businessNature?.isEducationMode ?? false;
        isManufacturingMode = businessNature?.isManufacturingMode ?? false;
        isLogisticsMode = businessNature?.isLogisticsMode ?? false;
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

      // Special vertical modes (Property/Hospitality/Tech/Financial/Healthcare/Education/Manufacturing/Logistics): order placement is disabled to prevent AI from creating physical product orders
      const isSpecialModeActive = isPropertyMode || isHospitalityMode || isTechSoftwareMode || isFinancialServiceMode || isHealthcareMode || isEducationMode || isManufacturingMode || isLogisticsMode;
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
        isTechSoftwareMode,
        isFinancialServiceMode,
        isHealthcareMode,
        isEducationMode,
        isManufacturingMode,
        isLogisticsMode,
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
      const llmResult = await this.aiService.generateCompletionDetailed(fullPrompt, customAiConfigId, actualImagePaths, activeCacheKey);
      const rawLlmOutput = llmResult.text;

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
      } else if (isTechSoftwareMode && (classification.intent === 'demo_request' || classification.intent === 'software_inquiry')) {
        await this.handleDemoRequest(tenantId, message.conversation, message.conversationId, classification.interestedSoftwareName, userText);
      } else if (isFinancialServiceMode && classification.intent === 'consultation_request') {
        await this.handleConsultationRequest(tenantId, message.conversation, message.conversationId, classification.interestedServiceName, userText);
      } else if (isHealthcareMode && (classification.intent === 'appointment_request' || classification.intent === 'doctor_inquiry')) {
        await this.handleAppointmentRequest(tenantId, message.conversation, message.conversationId, classification.interestedDoctorName, userText);
      } else if (isEducationMode && (classification.intent === 'course_admission_inquiry' || classification.intent === 'course_inquiry')) {
        await this.handleCourseAdmissionInquiry(tenantId, message.conversation, message.conversationId, classification.interestedCourseName, userText);
      } else if (isManufacturingMode && (classification.intent === 'bulk_rfq_inquiry' || classification.intent === 'rfq_inquiry')) {
        await this.handleBulkRfqInquiry(tenantId, message.conversation, message.conversationId, classification.interestedRfqProductName, userText);
      } else if (isLogisticsMode && (classification.intent === 'shipment_quote_request' || classification.intent === 'shipment_tracking_inquiry' || classification.intent === 'logistics_inquiry')) {
        await this.handleShipmentInquiry(tenantId, message.conversation, message.conversationId, classification.interestedShipmentRoute, userText);
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
      if (llmResult?.usage) {
        await this.aiService.recordUsageLog(tenantId, assistant.id, llmResult.usage);
      } else {
        const logsToCreate = Array.from({ length: creditsNeeded }).map(() => ({
          tenantId,
          assistantId: assistant.id,
          tokensUsed: 0,
          cachedTokens: 0,
          costUsd: 0,
        }));

        await this.prisma.aiUsageLog.createMany({
          data: logsToCreate
        });
      }

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
          intent: ['general', 'order_intent', 'order_confirmation', 'support_needed', 'product_lookup', 'property_inquiry', 'room_booking_inquiry', 'demo_request', 'software_inquiry', 'consultation_request', 'appointment_request', 'doctor_inquiry', 'course_admission_inquiry', 'course_inquiry', 'bulk_rfq_inquiry', 'rfq_inquiry', 'shipment_quote_request', 'shipment_tracking_inquiry', 'logistics_inquiry'].includes(parsed.intent)
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
          interestedSoftwareName: typeof parsed.interestedSoftwareName === 'string' ? parsed.interestedSoftwareName : undefined,
          interestedServiceName: typeof parsed.interestedServiceName === 'string' ? parsed.interestedServiceName : undefined,
          interestedDoctorName: typeof parsed.interestedDoctorName === 'string' ? parsed.interestedDoctorName : undefined,
          interestedCourseName: typeof parsed.interestedCourseName === 'string' ? parsed.interestedCourseName : undefined,
          interestedRfqProductName: typeof parsed.interestedRfqProductName === 'string' ? parsed.interestedRfqProductName : undefined,
          interestedShipmentRoute: typeof parsed.interestedShipmentRoute === 'string' ? parsed.interestedShipmentRoute : undefined,
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
    options?: { isImage: boolean; caption: string; isOrderPlacementActive: boolean; isSupportDetectionActive: boolean; isPropertyMode?: boolean; isHospitalityMode?: boolean; isTechSoftwareMode?: boolean; isFinancialServiceMode?: boolean; isHealthcareMode?: boolean; isEducationMode?: boolean; isManufacturingMode?: boolean; isLogisticsMode?: boolean }
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
    } else if (options?.isTechSoftwareMode) {
      // Tech & Software mode: software plans & tiers with features & demo link
      if (products.length > 0) {
        prompt += `\n--- SOFTWARE & TECH PACKAGES (Source of Truth for Available Plans) ---\n`;
        prompt += `IMPORTANT: You are a SOFTWARE & SAAS CONSULTANT. Do NOT create physical product orders. Help customers understand pricing tiers (Starter, Pro, Enterprise), key features, live demo links, and collect demo requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const tier = attrs.tier ? `[${String(attrs.tier).toUpperCase()}]` : '';
          const features = Array.isArray(attrs.features) ? attrs.features.join(', ') : (attrs.features || '');
          const demoUrl = attrs.demoUrl || attrs.demoLink || '';
          prompt += `- ${tier} ${p.name}`;
          if (features) prompt += ` | ⚡ Features: ${features}`;
          if (demoUrl) prompt += ` | 🔗 Demo: ${demoUrl}`;
          prompt += ` | 💰 BDT ${p.price.toString()}/mo\n`;
        });
      }
    } else if (options?.isFinancialServiceMode) {
      // Financial & Consulting mode: service packages with consultation fees, scope of work, & required docs
      if (products.length > 0) {
        prompt += `\n--- SERVICE PACKAGES & CONSULTANCY (Source of Truth for Services) ---\n`;
        prompt += `IMPORTANT: You are a FINANCIAL & PROFESSIONAL SERVICES CONSULTANT. Do NOT create physical product orders. Help clients check consultation packages, fees, scope of work, required documents, and collect consultation booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const scope = attrs.scope || attrs.description || '';
          const docs = Array.isArray(attrs.requiredDocs) ? attrs.requiredDocs.join(', ') : (attrs.requiredDocs || '');
          prompt += `- ${p.name}`;
          if (scope) prompt += ` | 💼 Scope: ${scope}`;
          if (docs) prompt += ` | 📋 Required Documents: ${docs}`;
          prompt += ` | 💰 Consultation Fee: BDT ${p.price.toString()}\n`;
        });
      }
    } else if (options?.isHealthcareMode) {
      // Healthcare & Clinic mode: doctors, specialties, visiting hours, & consultation fees
      if (products.length > 0) {
        prompt += `\n--- DOCTORS, CLINIC SERVICES & APPOINTMENTS (Source of Truth for Medical Care) ---\n`;
        prompt += `IMPORTANT: You are a MEDICAL & CLINIC RECEPTION ASSISTANT. Do NOT create physical product orders. Help patients check doctor availability, specializations, visiting hours, consultation fees, and collect appointment booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const spec = attrs.specialization || attrs.specialty || '';
          const hours = attrs.visitingHours || attrs.schedule || '';
          prompt += `- Dr. ${p.name}`;
          if (spec) prompt += ` | 🩺 Specialty: ${spec}`;
          if (hours) prompt += ` | 🕒 Visiting Hours: ${hours}`;
          prompt += ` | 💰 Consultation Fee: BDT ${p.price.toString()}\n`;
        });
      }
    } else if (options?.isEducationMode) {
      // Education & Academy mode: courses, batches, schedule, fees & syllabus
      if (products.length > 0) {
        prompt += `\n--- COURSES & ACADEMIC PROGRAMS (Source of Truth for Education & Academies) ---\n`;
        prompt += `IMPORTANT: You are an ACADEMIC COUNSELOR & ADMISSIONS ASSISTANT. Do NOT create physical product orders. Help students check course details, batch schedules, fees, syllabus overview, and collect course admission inquiry requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const duration = attrs.duration || attrs.courseDuration || '';
          const schedule = attrs.classSchedule || attrs.batchSchedule || '';
          const syllabus = attrs.syllabusUrl || attrs.syllabusLink || '';
          prompt += `- ${p.name}`;
          if (duration) prompt += ` | ⏳ Duration: ${duration}`;
          if (schedule) prompt += ` | 📅 Batch Schedule: ${schedule}`;
          if (syllabus) prompt += ` | 📚 Syllabus: ${syllabus}`;
          prompt += ` | 💰 Course Fee: BDT ${p.price.toString()}\n`;
        });
      }
    } else if (options?.isManufacturingMode) {
      // Manufacturing & Industrial mode: wholesale products, unit prices, MOQ, & spec sheets
      if (products.length > 0) {
        prompt += `\n--- B2B WHOLESALE & FACTORY PRODUCTS (Source of Truth for Manufacturing & Industrial) ---\n`;
        prompt += `IMPORTANT: You are a B2B FACTORY & WHOLESALE SALES ASSISTANT. Do NOT create physical retail orders. Help wholesale buyers check unit prices, Minimum Order Quantity (MOQ), product specifications, and collect bulk RFQ quotation requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const moq = attrs.moq || attrs.minimumOrderQty || attrs.minimumOrderQuantity || '';
          const spec = attrs.specifications || attrs.specSheet || attrs.material || '';
          prompt += `- ${p.name}`;
          if (moq) prompt += ` | 📦 MOQ: ${moq}`;
          if (spec) prompt += ` | 🏭 Specs: ${spec}`;
          prompt += ` | 💰 Wholesale Unit Price: BDT ${p.price.toString()}\n`;
        });
      }
    } else if (options?.isLogisticsMode) {
      // Logistics & Shipping mode: freight routes, fleet vehicle capacity, rates & tracking
      if (products.length > 0) {
        prompt += `\n--- LOGISTICS, FREIGHT & SHIPMENT SERVICES (Source of Truth for Logistics & Infrastructure) ---\n`;
        prompt += `IMPORTANT: You are a LOGISTICS, FREIGHT & DISPATCH ASSISTANT. Do NOT create physical retail orders. Help shippers check cargo routes, vehicle/fleet capacity (Tons/CBM), freight rates, tracking info, and collect shipment booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const route = attrs.route || attrs.originDestination || '';
          const capacity = attrs.capacity || attrs.vehicleType || attrs.weightLimit || '';
          const rate = attrs.rate || attrs.freightRate || '';
          prompt += `- ${p.name}`;
          if (route) prompt += ` | 🛣 Route: ${route}`;
          if (capacity) prompt += ` | 🚛 Fleet/Capacity: ${capacity}`;
          if (rate) prompt += ` | 💰 Freight Rate: BDT ${p.price.toString()}`;
          prompt += `\n`;
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
    } else if (options?.isTechSoftwareMode) {
      prompt += `2. TECH & SOFTWARE DEMO MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any product orders.\n`;
      prompt += `   - If the customer wants a software demo, trial access, pricing quote, or consultation, set "intent": "demo_request".\n`;
      prompt += `   - Set "interestedSoftwareName" to the software plan or product name the customer is inquiring about.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (options?.isFinancialServiceMode) {
      prompt += `2. FINANCIAL & CONSULTING MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any product orders.\n`;
      prompt += `   - If the client wants a financial advice consultation, tax planning session, legal advice, or service package info, set "intent": "consultation_request".\n`;
      prompt += `   - Set "interestedServiceName" to the service package name the client is inquiring about.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (options?.isHealthcareMode) {
      prompt += `2. HEALTHCARE & CLINIC APPOINTMENT MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any product orders.\n`;
      prompt += `   - If the patient wants a doctor appointment, serial booking, visiting hours, or doctor info, set "intent": "appointment_request".\n`;
      prompt += `   - Set "interestedDoctorName" to the doctor name or medical specialty the patient is inquiring about.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (options?.isEducationMode) {
      prompt += `2. EDUCATION & ACADEMY ADMISSION MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any product orders.\n`;
      prompt += `   - If the student wants course admission, batch schedule, fee structure, syllabus, or course info, set "intent": "course_admission_inquiry".\n`;
      prompt += `   - Set "interestedCourseName" to the course or batch name the student is inquiring about.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (options?.isManufacturingMode) {
      prompt += `2. MANUFACTURING & B2B WHOLESALE MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any retail product orders.\n`;
      prompt += `   - If the buyer requests a wholesale quote, bulk order pricing, factory MOQ, custom manufacturing, or RFQ, set "intent": "bulk_rfq_inquiry".\n`;
      prompt += `   - Set "interestedRfqProductName" to the wholesale product name the buyer is inquiring about.\n`;
      prompt += `   - For general questions, use "intent": "general".\n`;
    } else if (options?.isLogisticsMode) {
      prompt += `2. LOGISTICS & TRUCK SHIPPING MODE IS ACTIVE:\n`;
      prompt += `   - You MUST NOT create or propose any retail product orders.\n`;
      prompt += `   - If the shipper requests a freight quote, truck booking, cargo shipping rate, container dispatch, or shipment tracking, set "intent": "shipment_quote_request".\n`;
      prompt += `   - Set "interestedShipmentRoute" to the origin-destination route or vehicle type the shipper is inquiring about.\n`;
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
    } else if (options?.isTechSoftwareMode) {
      prompt += `  "intent": "general | demo_request | support_needed | product_lookup",\n`;
      prompt += `  "interestedSoftwareName": "name of software plan or product customer is interested in (or empty string)",\n`;
    } else if (options?.isFinancialServiceMode) {
      prompt += `  "intent": "general | consultation_request | support_needed | product_lookup",\n`;
      prompt += `  "interestedServiceName": "name of service package client is interested in (or empty string)",\n`;
    } else if (options?.isHealthcareMode) {
      prompt += `  "intent": "general | appointment_request | support_needed | product_lookup",\n`;
      prompt += `  "interestedDoctorName": "name of doctor or specialty patient is interested in (or empty string)",\n`;
    } else if (options?.isEducationMode) {
      prompt += `  "intent": "general | course_admission_inquiry | support_needed | product_lookup",\n`;
      prompt += `  "interestedCourseName": "name of course or batch student is interested in (or empty string)",\n`;
    } else if (options?.isManufacturingMode) {
      prompt += `  "intent": "general | bulk_rfq_inquiry | support_needed | product_lookup",\n`;
      prompt += `  "interestedRfqProductName": "name of wholesale product buyer is inquiring about (or empty string)",\n`;
    } else if (options?.isLogisticsMode) {
      prompt += `  "intent": "general | shipment_quote_request | shipment_tracking_inquiry | support_needed | product_lookup",\n`;
      prompt += `  "interestedShipmentRoute": "route or vehicle type shipper is inquiring about (or empty string)",\n`;
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

      // 2. Move contact to Intake stage (only if not already assigned a stage)
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

      // 2. Move contact to Intake stage (only if not already assigned a stage)
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

  // ── Software Demo Request Handler (Tech & Software Mode) ───────────────────
  // Called when AI detects a demo_request intent in Tech & Software Mode.
  // Moves contact to 'Qualified' Kanban stage and records a ContactNote.
  private async handleDemoRequest(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedSoftwareName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Qualified' stage
      let qualifiedStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Qualified' }
      });
      if (!qualifiedStage) {
        qualifiedStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Qualified', color: '#10b981', order: 1 }
        });
      }

      // 2. Move contact to Qualified stage (only if not already assigned a stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });

      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: qualifiedStage.id }
        });
      }

      // 3. Record ContactNote with demo request details
      const noteContent = [
        '[AI Software Demo Request]',
        interestedSoftwareName ? `Software/Plan: ${interestedSoftwareName}` : '',
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
        type: 'DEMO_REQUEST',
        metadataJson: { softwareName: interestedSoftwareName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / product specialists
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Software Demo Request',
        `${contact?.name || 'A customer'} requested a software demo for${interestedSoftwareName ? ' "' + interestedSoftwareName + '"' : ' a product'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Software demo request recorded for contact ${contactId}, software: ${interestedSoftwareName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleDemoRequest failed: ${err.message}`);
    }
  }

  // ── Consultation Request Handler (Financial & Professional Services Mode) ──
  // Called when AI detects a consultation_request intent in Financial Service Mode.
  // Moves contact to 'Intake' Kanban stage and records a ContactNote.
  private async handleConsultationRequest(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedServiceName: string | undefined,
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
          data: { tenantId, name: 'Intake', color: '#3b82f6', order: 0 }
        });
      }

      // 2. Move contact to Intake stage (only if not already assigned a stage)
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

      // 3. Record ContactNote with consultation details
      const noteContent = [
        '[AI Consultation Request]',
        interestedServiceName ? `Service: ${interestedServiceName}` : '',
        `Client message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'CONSULTATION_REQUEST',
        metadataJson: { serviceName: interestedServiceName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / financial advisors
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Consultation Request',
        `${contact?.name || 'A client'} requested a consultation for${interestedServiceName ? ' "' + interestedServiceName + '"' : ' a service package'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Consultation request recorded for contact ${contactId}, service: ${interestedServiceName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleConsultationRequest failed: ${err.message}`);
    }
  }

  // ── Appointment Request Handler (Healthcare & Clinic Mode) ────────────────
  // Called when AI detects an appointment_request intent in Healthcare Mode.
  // Moves contact to 'Triage' Kanban stage and records a ContactNote.
  private async handleAppointmentRequest(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedDoctorName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Triage' stage
      let triageStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Triage' }
      });
      if (!triageStage) {
        triageStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Triage', color: '#10b981', order: 0 }
        });
      }

      // 2. Move contact to Triage stage (only if not already assigned a stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });

      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: triageStage.id }
        });
      }

      // 3. Record ContactNote with appointment request details
      const noteContent = [
        '[AI Appointment Request]',
        interestedDoctorName ? `Doctor/Specialty: ${interestedDoctorName}` : '',
        `Patient message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'APPOINTMENT_REQUEST',
        metadataJson: { doctorName: interestedDoctorName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / clinic receptionists
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Appointment Request',
        `${contact?.name || 'A patient'} requested an appointment for${interestedDoctorName ? ' "' + interestedDoctorName + '"' : ' a doctor/clinic service'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Appointment request recorded for contact ${contactId}, doctor: ${interestedDoctorName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleAppointmentRequest failed: ${err.message}`);
    }
  }

  // ── Course Admission Inquiry Handler (Education & Academy Mode) ───────────
  // Called when AI detects a course_admission_inquiry intent in Education Mode.
  // Moves contact to 'Admissions' Kanban stage and records a ContactNote.
  private async handleCourseAdmissionInquiry(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedCourseName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Admissions' stage
      let admissionsStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Admissions' }
      });
      if (!admissionsStage) {
        admissionsStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Admissions', color: '#8b5cf6', order: 0 }
        });
      }

      // 2. Move contact to Admissions stage (only if not already assigned a stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });

      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: admissionsStage.id }
        });
      }

      // 3. Record ContactNote with course admission inquiry details
      const noteContent = [
        '[AI Course Admission Inquiry]',
        interestedCourseName ? `Course/Batch: ${interestedCourseName}` : '',
        `Student message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'COURSE_ADMISSION_INQUIRY',
        metadataJson: { courseName: interestedCourseName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / academic counselors
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Course Admission Inquiry',
        `${contact?.name || 'A student'} requested information for${interestedCourseName ? ' "' + interestedCourseName + '"' : ' a course/batch'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Course admission inquiry recorded for contact ${contactId}, course: ${interestedCourseName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleCourseAdmissionInquiry failed: ${err.message}`);
    }
  }

  // ── B2B Bulk RFQ Inquiry Handler (Manufacturing & Industrial Mode) ───────
  // Called when AI detects a bulk_rfq_inquiry intent in Manufacturing Mode.
  // Moves contact to 'RFQ / Quotations' Kanban stage and records a ContactNote.
  private async handleBulkRfqInquiry(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedRfqProductName: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'RFQ / Quotations' stage
      let rfqStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'RFQ / Quotations' }
      });
      if (!rfqStage) {
        rfqStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'RFQ / Quotations', color: '#f59e0b', order: 0 }
        });
      }

      // 2. Move contact to RFQ / Quotations stage (only if not already assigned a stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });

      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: rfqStage.id }
        });
      }

      // 3. Record ContactNote with B2B bulk RFQ details
      const noteContent = [
        '[AI B2B Bulk RFQ Inquiry]',
        interestedRfqProductName ? `Wholesale Product: ${interestedRfqProductName}` : '',
        `Buyer message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'BULK_RFQ_INQUIRY',
        metadataJson: { productName: interestedRfqProductName || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / wholesale sales managers
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New B2B Bulk RFQ Inquiry',
        `${contact?.name || 'A buyer'} requested a wholesale quotation for${interestedRfqProductName ? ' "' + interestedRfqProductName + '"' : ' a product'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`B2B Bulk RFQ inquiry recorded for contact ${contactId}, product: ${interestedRfqProductName || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleBulkRfqInquiry failed: ${err.message}`);
    }
  }

  // ── Logistics & Shipping Handler (Logistics & Infrastructure Mode) ───────
  // Called when AI detects a shipment_quote_request intent in Logistics Mode.
  // Moves contact to 'Shipments & Bookings' Kanban stage and records a ContactNote.
  private async handleShipmentInquiry(
    tenantId: string,
    conversation: any,
    conversationId: string,
    interestedShipmentRoute: string | undefined,
    userText: string
  ) {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');
    const contactId = conversation.contactId;

    try {
      // 1. Find or create 'Shipments & Bookings' stage
      let shipmentStage = await this.prisma.kanbanStage.findFirst({
        where: { tenantId, name: 'Shipments & Bookings' }
      });
      if (!shipmentStage) {
        shipmentStage = await this.prisma.kanbanStage.create({
          data: { tenantId, name: 'Shipments & Bookings', color: '#0284c7', order: 0 }
        });
      }

      // 2. Move contact to Shipments & Bookings stage (only if not already assigned a stage)
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { stage: true }
      });

      if (!contact?.stageId || !contact.stage) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { stageId: shipmentStage.id }
        });
      }

      // 3. Record ContactNote with logistics shipment inquiry details
      const noteContent = [
        '[AI Logistics Shipment Inquiry]',
        interestedShipmentRoute ? `Route/Fleet: ${interestedShipmentRoute}` : '',
        `Shipper message: "${userText.slice(0, 300)}"`
      ].filter(Boolean).join(' | ');

      await this.prisma.contactNote.create({
        data: { contactId, content: noteContent }
      });

      // 4. Activity log
      await this.activityLogService.record({
        tenantId,
        conversationId,
        contactId,
        type: 'SHIPMENT_INQUIRY',
        metadataJson: { route: interestedShipmentRoute || 'Unknown', source: 'ai' }
      });

      // 5. Notify tenant admins / logistics dispatchers
      await this.notificationsService.createNotificationForTenantAdmins(
        tenantId,
        'New Shipment Booking Inquiry',
        `${contact?.name || 'A shipper'} requested a logistics quote/booking for${interestedShipmentRoute ? ' "' + interestedShipmentRoute + '"' : ' a route/fleet'}.`,
        'inbox'
      ).catch(() => {});

      this.logger.log(`Shipment inquiry recorded for contact ${contactId}, route: ${interestedShipmentRoute || 'N/A'}`);
    } catch (err: any) {
      this.logger.error(`handleShipmentInquiry failed: ${err.message}`);
    }
  }
}
