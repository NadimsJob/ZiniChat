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
import { CapiHubService } from '../capi-hub/capi-hub.service';
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
  sendProductPhotoIds?: string[]; // IDs of products to send photos for (1 to 10)
  customerDetails?: {
    name?: string;
    phone?: string;
    address?: string;
    deliveryArea?: 'inside_dhaka' | 'outside_dhaka';
  };
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
    private inboxGateway: InboxGateway,
    private capiHubService: CapiHubService
  ) {}

  private assertBelongsToTenant(record: { tenantId: string }, tenantId: string, entityName: string) {
    if (!record || record.tenantId !== tenantId) {
      throw new Error(`Security Violation: ${entityName} does not belong to tenant ${tenantId}`);
    }
  }

  /**
   * Ensures that an image path or remote URL is available on local disk.
   * If it is a remote HTTP/HTTPS URL, downloads it to /uploads/tenants/${tenantId}/.
   * Returns the absolute path on disk, or null if unresolvable.
   */
  async ensureLocalImage(imagePathOrUrl: string, tenantId: string): Promise<string | null> {
    if (!imagePathOrUrl || typeof imagePathOrUrl !== 'string') return null;

    // Remote URL (Messenger, Instagram, external CDN)
    if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
      try {
        const uploadDir = path.join(process.cwd(), 'uploads', 'tenants', tenantId);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const ext = imagePathOrUrl.includes('.png') ? '.png' : imagePathOrUrl.includes('.webp') ? '.webp' : '.jpg';
        const fileName = `img_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
        const localPath = path.join(uploadDir, fileName);

        const response = await fetch(imagePathOrUrl, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
          this.logger.warn(`Failed to download remote image from ${imagePathOrUrl}: HTTP ${response.status}`);
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(localPath, buffer);
        this.logger.log(`Downloaded remote image to ${localPath} (${buffer.length} bytes)`);
        return localPath;
      } catch (err: any) {
        this.logger.warn(`ensureLocalImage failed to download from ${imagePathOrUrl}: ${err.message}`);
        return null;
      }
    }

    // Local path
    const absolutePath = path.isAbsolute(imagePathOrUrl)
      ? imagePathOrUrl
      : path.join(process.cwd(), imagePathOrUrl.startsWith('/') ? imagePathOrUrl.substring(1) : imagePathOrUrl);

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }

    return null;
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

      if (!message || message.direction !== 'inbound' || (message.type !== 'text' && message.type !== 'image' && (message.type as string) !== 'audio')) {
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
          where: { tenantId, isActive: true }
        });
        if (widget && widget.isAiAutoReplyEnabled === false) {
          this.logger.debug(`AI Auto-Reply is disabled on website widget ${widget.id}. Skipping.`);
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

      // Check Tenant Subscription/Trial Status
      const subStatus = await this.quotaService.isTenantSubscriptionActive(tenantId);
      if (!subStatus.isActive) {
        this.logger.warn(`[AI Gated] Skipped AI completion for Tenant ${tenantId}: ${subStatus.reason}`);
        return { skipped: true, reason: subStatus.reason };
      }

      // Check AI Quota
      try {
        await this.quotaService.checkAiQuota(tenantId);
      } catch (error: any) {
        this.logger.warn(`[AI Gated] Skipped AI completion for Tenant ${tenantId}: AI Quota Exhausted.`);
        return { skipped: true, reason: 'AI_QUOTA_EXHAUSTED' };
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
        this.logger.warn(`Skipped AI auto-reply for tenant ${tenantId}: AI Assistant missing, inactive, or routingMode custom_only (assistant: ${assistant?.id}, isActive: ${assistant?.isActive}).`);
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
      const isProductMatchingActive = !isSpecialModeActive && (toolMap['product_matching']?.isEnabled ?? true) && planProductMatching;

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
      const { periodStart } = await this.quotaService.getActivePeriodForTenant(tenantId);
      const messagesUsed = await this.quotaService.getMessageUsage(tenantId, periodStart);

      if (messagesUsed >= quotas.messageQuota) {
        this.logger.warn(`Tenant ${tenantId} exceeded global Message quota (${messagesUsed}/${quotas.messageQuota}).`);
        return;
      }

      // Extract image path if image
      let imagePathsToPass: string[] = [];
      let userCaption = '';
      if (isImageMessage) {
        if (typeof message.content === 'object' && message.content !== null) {
          const cnt = message.content as any;
          userCaption = cnt.caption || cnt.text || '';
          const candidate = cnt.localUrl || cnt.localPath || cnt.mediaUrl || cnt.url || cnt.path;
          if (candidate) {
            const resolvedPath = await this.ensureLocalImage(candidate, tenantId);
            if (resolvedPath) {
              imagePathsToPass.push(resolvedPath);
            }
          }
        } else if (typeof message.content === 'string') {
          userCaption = message.content;
          if (message.content.startsWith('http://') || message.content.startsWith('https://')) {
            const resolvedPath = await this.ensureLocalImage(message.content, tenantId);
            if (resolvedPath) {
              imagePathsToPass.push(resolvedPath);
            }
          }
        }
      }

      const actualImagePaths = canRunVision && imagePathsToPass.length > 0 ? imagePathsToPass : undefined;

      // --- Audio message handling ---
      const isAudioMessage = (message.type as string) === 'audio';
      if (isAudioMessage) {
        const transcript = (message.content as any)?.transcript;
        if (!transcript || transcript.includes('[Audio transcription failed')) {
          // No usable transcript — skip AI, token saver
          this.logger.log(`Skipping AI for audio message without usable transcript (msg ${message.id})`);
          return;
        }
        // Transcript ready — pass to AI as voice text
      }

      let userText = '';
      let quotedContextText = '';
      if (isAudioMessage) {
        // Use the Whisper transcript as the user's text input
        userText = `[Voice Message Transcription]: "${(message.content as any).transcript}"`;
      } else if (!isImageMessage) {
        if (typeof message.content === 'object' && message.content !== null) {
          const cnt = message.content as any;
          const rawText = cnt.body || cnt.text || cnt.caption || '';
          if (cnt.quotedMsg?.text) {
            quotedContextText = `[Replying to Product/Message: "${cnt.quotedMsg.text}"]`;
            userText = `${quotedContextText}\n${rawText}`;
          } else {
            userText = rawText || JSON.stringify(message.content);
          }
        } else {
          userText = String(message.content);
        }
      } else {
        userText = userCaption ? `[Image Sent] Caption: ${userCaption}` : '[Image Sent by Customer]';
      }

      // Stage 0 — Context-aware RAG Augmentation & Dynamic Indexing
      let ragQuery = userText;

      // Case 1: If an explicit quoted message text exists, prioritize it in the RAG search query
      if (typeof message.content === 'object' && message.content !== null && (message.content as any).quotedMsg?.text) {
        const qText = (message.content as any).quotedMsg.text;
        ragQuery = `${qText} ${userText}`;
      } else {
        // Case 2: Short inquiry, acknowledgment, or demonstrative pronoun reference ("এইটার দাম কত?", "দাম কত?", "এটা নিব", "ok", "yes", etc.)
        const lowerUser = userText.toLowerCase();
        const isDemonstrativeProductInquiry = [
          'এইটা', 'এটার', 'এইটার', 'ঐটা', 'ঐটার', 'এটা', 'দাম কত', 'কত দাম',
          'দাম', 'সাইজ কি', 'অর্ডার করব', 'নিব', 'নিতে চাই', 'অর্ডার করতে চাই',
          'price', 'cost', 'how much', 'this one', 'order this'
        ].some(term => lowerUser.includes(term));

        const ragWordCount = userText.trim().split(/\s+/).filter(Boolean).length;
        if ((ragWordCount <= 6 || isDemonstrativeProductInquiry) && !isAudioMessage) {
          try {
            // Check for recent outbound image message (product photo sent by AI in this conversation)
            const lastOutboundImage = await this.prisma.message.findFirst({
              where: {
                conversationId: message.conversationId,
                direction: 'outbound',
                type: 'image'
              },
              orderBy: { createdAt: 'desc' }
            });

            let referencedPhotoText = '';
            if (lastOutboundImage?.content) {
              let parsedImgContent: any = lastOutboundImage.content;
              if (typeof lastOutboundImage.content === 'string') {
                try { parsedImgContent = JSON.parse(lastOutboundImage.content); } catch { parsedImgContent = { body: lastOutboundImage.content }; }
              }
              referencedPhotoText = parsedImgContent?.body || parsedImgContent?.text || parsedImgContent?.productName || '';
            }

            if (referencedPhotoText) {
              ragQuery = `${referencedPhotoText} ${userText}`;
              if (!quotedContextText && isDemonstrativeProductInquiry) {
                userText = `[Referenced Recent Product Photo: "${referencedPhotoText}"]\n${userText}`;
              }
            } else {
              // Fallback to last outbound message
              const lastAiMsg = await this.prisma.message.findFirst({
                where: { conversationId: message.conversationId, direction: 'outbound' },
                orderBy: { createdAt: 'desc' },
                select: { content: true }
              });
              if (lastAiMsg?.content) {
                const lastAiText =
                  typeof lastAiMsg.content === 'object' && lastAiMsg.content !== null
                    ? (lastAiMsg.content as any).text || (lastAiMsg.content as any).body || ''
                    : String(lastAiMsg.content);
                if (lastAiText.trim()) {
                  ragQuery = `${lastAiText.slice(0, 300)} ${userText}`;
                }
              }
            }
          } catch (e) {
            this.logger.debug('Context-aware RAG augmentation skipped:', e);
          }
        }
      }

      let retrievedProducts = await this.aiService.searchRelevantProducts(tenantId, ragQuery, 10);
      // When customer sends an image, if RAG on generic text returned 0 products,
      // load the tenant's top active catalog products so Vision AI has real store items to compare against!
      if (isImageMessage && retrievedProducts.length === 0) {
        retrievedProducts = await this.prisma.product.findMany({
          where: { tenantId, isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
      }
      const retrievedQnas = await this.aiService.searchRelevantQnas(tenantId, ragQuery, 5);
      let retrievedChunks: any[] = [];
      try {
        const queryVector = await this.aiService.generateEmbedding(ragQuery).catch(() => null);
        if (queryVector) {
          retrievedChunks = await this.aiService.searchRelevantChunks(tenantId, queryVector, 3).catch(() => []);
        }
      } catch (e) {
        // Fallback if vector embedding fails
      }

      // 4. Stage A — Structured Context & Prompt Building
      const prompt = await this.buildContextPrompt(message.conversationId, assistant, {
        isImage: canRunVision && imagePathsToPass.length > 0,
        caption: userCaption,
        isOrderPlacementActive,
        orderPlacementConfig: toolMap['order_placement']?.configJson,
        isSupportDetectionActive,
        isPropertyMode,
        isHospitalityMode,
        isTechSoftwareMode,
        isFinancialServiceMode,
        isHealthcareMode,
        isEducationMode,
        isManufacturingMode,
        isLogisticsMode,
        retrievedProducts,
        retrievedQnas,
        retrievedChunks,
      });

      const fullPrompt = `${prompt}\n\nCustomer: ${userText}`;

      // Build static context checksum & get/create prompt cache
      let activeCacheKey: string | undefined = undefined;
      try {
        const labels = await this.prisma.label.findMany({ where: { tenantId } });

        const checksum = this.aiCacheService.computeChecksum(assistant.systemPrompt || '', [], retrievedQnas, labels);
        const activeProvider = targetConfig?.provider || assistant.provider || 'gemini';
        const activeModelName = targetConfig?.modelName || assistant.modelName || 'gemini-1.5-flash';
        const activeApiKey = targetConfig?.apiKey;

        const cacheResult = await this.aiCacheService.getOrCreateCache({
          tenantId,
          provider: activeProvider,
          modelName: activeModelName,
          apiKey: activeApiKey,
          systemPrompt: assistant.systemPrompt || '',
          knowledgeContext: prompt,
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

      if (isOrderPlacementActive || (message.conversation as any)?.pendingOrderProposal) {
        const orderResult = await this.handleOrderPlacement(
          tenantId,
          message.conversation,
          classification,
          message.conversationId,
          userText,
          imagePathsToPass
        );
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

      // 5.9 Universal Order Confirmation Safety Net (Zero False Confirmation Guarantee)
      finalReplyText = await this.enforceOrderConfirmationIntegrity(
        tenantId,
        message.conversation,
        message.conversationId,
        finalReplyText,
        assistant?.id
      );

      // 6. Response Dispatch (Text Reply First)
      if (finalReplyText && finalReplyText.trim() !== '') {
        await this.inboxService.saveOutboundMessage(tenantId, message.conversationId, finalReplyText, 'text', undefined, assistant.id);
      }

      // Handler 3: Product Photo Matching & Multi-Product Dispatch (Runs after text reply)
      if (isProductMatchingActive || (classification.intent === 'product_lookup' && classification.sendProductPhotoIds?.length)) {
        const minConf = toolMap['product_matching']?.configJson?.minMatchConfidence ?? 0.6;
        const maxPhotos = Math.min(Math.max(toolMap['product_matching']?.configJson?.maxProductsToSend ?? 10, 1), 10);
        await this.handleProductMatching(tenantId, message.conversationId, classification, minConf, maxPhotos, assistant.id, userText);
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

      // 7. Log AI Usage Credits
      if (llmResult?.usage) {
        await this.aiService.recordUsageLog(tenantId, assistant.id, llmResult.usage, creditsNeeded);
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

  private safeParseLlmJson(rawText: string): any {
    if (!rawText) return {};
    let cleaned = String(rawText).trim();

    // 1. Strip markdown code fences if wrapped
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    // 2. If JSON is preceded or followed by text, extract the outermost JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }

    // 3. Attempt direct parse
    try {
      return JSON.parse(cleaned);
    } catch (e1) {
      // 4. Attempt sanitizing unescaped control characters (newlines, tabs) inside string literals
      try {
        const sanitized = cleaned.replace(/"((?:[^"\\]|\\.)*)"/gs, (match, content) => {
          return '"' + content
            .replace(/\r\n/g, '\\n')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\n')
            .replace(/\t/g, '\\t') + '"';
        });
        return JSON.parse(sanitized);
      } catch (e2) {
        // 5. Regex extraction fallback if JSON has non-standard syntax errors
        const result: any = {};
        const replyMatch = cleaned.match(/"(?:reply_?text|response|reply|message|text)"\s*:\s*"((?:[^"\\]|\\.)*)"/si);
        if (replyMatch) {
          result.replyText = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        const intentMatch = cleaned.match(/"intent"\s*:\s*"([^"]+)"/i);
        if (intentMatch) {
          result.intent = intentMatch[1];
        }

        const supportSignalMatch = cleaned.match(/"supportSignal"\s*:\s*(true|false)/i);
        if (supportSignalMatch) {
          result.supportSignal = supportSignalMatch[1] === 'true';
        }

        if (Object.keys(result).length > 0) {
          return result;
        }
        throw e1;
      }
    }
  }

  private parseClassificationOutput(rawText: string): StructuredAiClassification {
    try {
      const parsed = this.safeParseLlmJson(rawText);

      const rawReply = parsed.replyText ?? parsed.replytext ?? parsed.reply_text ?? parsed.response ?? parsed.reply ?? parsed.message ?? parsed.text;

      if (typeof rawReply === 'string' || typeof parsed.intent === 'string') {
        const replyText = typeof rawReply === 'string' ? rawReply : '';
        return {
          replyText: this.formatSpaciousResponse(replyText),
          intent: ['general', 'order_intent', 'order_confirmation', 'support_needed', 'product_lookup', 'property_inquiry', 'room_booking_inquiry', 'demo_request', 'software_inquiry', 'consultation_request', 'appointment_request', 'doctor_inquiry', 'course_admission_inquiry', 'course_inquiry', 'bulk_rfq_inquiry', 'rfq_inquiry', 'shipment_quote_request', 'shipment_tracking_inquiry', 'logistics_inquiry'].includes(parsed.intent)
            ? parsed.intent
            : 'general',
          orderProposal: Array.isArray(parsed.orderProposal) ? parsed.orderProposal : undefined,
          imageProductDescription: parsed.imageProductDescription,
          sendProductPhotoIds: Array.isArray(parsed.sendProductPhotoIds) ? parsed.sendProductPhotoIds.map(String) : undefined,
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
          customerDetails: (parsed.customerDetails && typeof parsed.customerDetails === 'object') ? {
            name: typeof parsed.customerDetails.name === 'string' ? parsed.customerDetails.name.trim() : undefined,
            phone: typeof parsed.customerDetails.phone === 'string' ? parsed.customerDetails.phone.trim() : undefined,
            address: typeof parsed.customerDetails.address === 'string' ? parsed.customerDetails.address.trim() : undefined,
            deliveryArea: ['inside_dhaka', 'outside_dhaka'].includes(parsed.customerDetails.deliveryArea) ? parsed.customerDetails.deliveryArea : undefined
          } : undefined
        };
      }
    } catch (e) {
      // Fallback: If JSON parsing fails, extract human text and fallback to general
    }

    return {
      replyText: this.formatSpaciousResponse(rawText),
      intent: 'general',
      supportSignal: false
    };
  }

  private async handleOrderPlacement(
    tenantId: string,
    conversation: any,
    classification: StructuredAiClassification,
    conversationId: string,
    userText?: string,
    imagePaths?: string[]
  ): Promise<{ overrideReplyText?: string } | void> {
    this.assertBelongsToTenant(conversation, tenantId, 'Conversation');

    // Fetch assistant tools to get order_placement configuration
    const assistant = await this.prisma.aiAssistant.findFirst({
      where: { tenantId },
      include: { tools: true }
    });
    const orderTool = (assistant?.tools || []).find((t: any) => t.toolType === 'order_placement');
    const orderConfig: any = orderTool?.configJson || {};
    const paymentPolicy: 'cod' | 'delivery_advance' | 'full_advance' = orderConfig.paymentPolicy || 'cod';
    const chargeInsideDhaka = Number(orderConfig.deliveryChargeInsideDhaka ?? 60);
    const chargeOutsideDhaka = Number(orderConfig.deliveryChargeOutsideDhaka ?? 120);
    const mfsAccounts: any[] = orderConfig.mfsAccounts || [];
    const paymentNote = orderConfig.paymentInstructionNote || '';

    // Extract & sync customer contact info (name, phone, address)
    const contact = (conversation.contactId && (this.prisma as any).contact)
      ? await (this.prisma as any).contact.findUnique({
          where: { id: conversation.contactId }
        }).catch(() => null)
      : null;

    const rawUserText = (userText || '').trim();
    const rawTextLower = rawUserText.toLowerCase();

    // Phone detection: 11 digits Bangladesh mobile
    const phoneMatch = rawUserText.match(/(?:^|\D)(01[3-9]\d{8})(?:\D|$)/);
    const detectedPhone = phoneMatch ? phoneMatch[1] : null;
    const cd = classification.customerDetails;
    const phoneToSet = detectedPhone || (cd?.phone && /^01[3-9]\d{8}$/.test(cd.phone) ? cd.phone : null);

    // Location / Delivery Area detection (inside vs outside Dhaka)
    const combinedLocationText = [
      rawUserText,
      cd?.address,
      contact?.address,
      (conversation.pendingOrderProposal as any)?.customerDetails?.address
    ].filter(Boolean).join(' ').toLowerCase();

    const outsideDhakaKeywords = [
      'ঢাকার বাইরে', 'outside dhaka', 'out of dhaka',
      'নোয়াখালী', 'noakhali', 'সোনাপুর', 'sonapur', 'মাইজদী', 'maijdee',
      'ফেনী', 'feni', 'লক্ষ্মীপুর', 'lakshmipur', 'চাঁদপুর', 'chandpur',
      'কুমিল্লা', 'comilla', 'cumilla', 'কক্সবাজার', 'cox', 'কক্স',
      'চট্টগ্রাম', 'chittagong', 'chattogram', 'সিলেট', 'sylhet',
      'রাজশাহী', 'rajshahi', 'খুলনা', 'khulna', 'বরিশাল', 'barishal',
      'রংপুর', 'rangpur', 'ময়মনসিংহ', 'mymensingh', 'বগুড়া', 'bogura', 'bogra',
      'গাজীপুর', 'gazipur', 'নারায়ণগঞ্জ', 'narayanganj', 'সাভার', 'savar', 'কেরানীগঞ্জ', 'কেরানিগঞ্জ',
      'যশোর', 'jessore', 'jashore', 'পাবনা', 'pabna', 'দিনাজপুর', 'dinajpur',
      'কুষ্টিয়া', 'kushtia', 'টাঙ্গাইল', 'tangail', 'সিরাজগঞ্জ', 'sirajganj',
      'ফরিদপুর', 'faridpur', 'নাটোর', 'natore', 'ঝিনাইদহ', 'jhenaidah',
      'বাগেরহাট', 'bagerhat', 'সাতক্ষীরা', 'satkhira', 'পটুয়াখালী', 'patuakhali',
      'ভোলা', 'bhola', 'হবিগঞ্জ', 'habiganj', 'মৌলভীবাজার', 'moulvibazar',
      'সুনামগঞ্জ', 'sunamganj', 'নেত্রকোণা', 'netrokona', 'জামালপুর', 'jamalpur',
      'শেরপুর', 'sherpur', 'কিশোরগঞ্জ', 'kishoreganj', 'নরসিংদী', 'narsingdi',
      'মুন্সীগঞ্জ', 'munshiganj', 'মানিকগঞ্জ', 'manikganj', 'মাদারীপুর', 'madaripur',
      'শরীয়তপুর', 'shariatpur', 'গোপালগঞ্জ', 'gopalganj', 'রাজবাড়ী', 'rajbari',
      'চুয়াডাঙ্গা', 'chuadanga', 'মেহেরপুর', 'meherpur', 'মাগুরা', 'magura',
      'নড়াইল', 'narail', 'পিরোজপুর', 'pirojpur', 'ঝালকাঠি', 'jhalokati',
      'বরগুনা', 'barguna', 'পঞ্চগড়', 'panchagarh', 'ঠাকুরগাঁও', 'thakurgaon',
      'নীলফামারী', 'nilphamari', 'লালমনিরহাট', 'lalmonirhat', 'কুড়িগ্রাম', 'kurigram',
      'গাইবান্ধা', 'gaibandha', 'জয়পুরহাট', 'joypurhat', 'নওগাঁ', 'naogaon',
      'চাঁপাইনবাবগঞ্জ', 'chapainawabganj'
    ];

    const insideDhakaKeywords = [
      'মিরপুর', 'mirpur', 'ধানমন্ডি', 'dhanmondi', 'গুলশান', 'gulshan',
      'উত্তরা', 'uttara', 'মোহাম্মদপুর', 'mohammadpur', 'মতিঝিল', 'motijheel',
      'বনানী', 'banani', 'বাড্ডা', 'badda', 'বাসাবো', 'খিলগাঁও', 'khilgaon',
      'মগবাজার', 'mogbazar', 'মহাখালী', 'mohakhali', 'তেজগাঁও', 'tejgaon',
      'যাত্রাবাড়ী', 'যাত্রাবাড়ী', 'jatrabari', 'ওয়ারী', 'wari', 'পল্টন', 'paltan',
      'আজিমপুর', 'azimpur', 'নিউমার্কেট', 'new market', 'লালবাগ', 'lalbagh',
      'রমনা', 'ramna', 'রামপুরা', 'rampura', 'খিলক্ষেত', 'khilkhet',
      'বসুন্ধরা', 'bashundhara', 'কাফরুল', 'inside dhaka', 'dhaka city'
    ];

    const isOutsideDhaka = (
      outsideDhakaKeywords.some(kw => combinedLocationText.includes(kw)) ||
      cd?.deliveryArea === 'outside_dhaka'
    );
    const isInsideDhaka = (
      !isOutsideDhaka && (
        insideDhakaKeywords.some(kw => combinedLocationText.includes(kw)) ||
        ((combinedLocationText.includes('ঢাকা') || combinedLocationText.includes('dhaka')) && !combinedLocationText.includes('ঢাকার বাইরে') && !combinedLocationText.includes('outside dhaka')) ||
        cd?.deliveryArea === 'inside_dhaka'
      )
    );
    const detectedArea: 'inside_dhaka' | 'outside_dhaka' | null = isOutsideDhaka ? 'outside_dhaka' : isInsideDhaka ? 'inside_dhaka' : null;

    // Contact DB auto-sync
    if (contact) {
      const updates: any = {};
      if (phoneToSet && (!contact.phone || contact.phone.length < 11)) {
        updates.phone = phoneToSet;
      }
      if (cd?.address && (!contact.address || contact.address.length < 5)) {
        updates.address = cd.address;
      }
      if (cd?.name && (!contact.name || contact.name.toLowerCase().includes('user') || contact.name.toLowerCase().includes('guest'))) {
        updates.name = cd.name;
      }

      if (Object.keys(updates).length > 0) {
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: updates
        }).catch(err => this.logger.warn(`Failed to auto-update contact: ${err.message}`));
        Object.assign(contact, updates);
      }
    }

    // =========================================================================
    // Flow 0.5: Resuming Multi-turn Order (Customer providing missing details)
    // =========================================================================
    if (conversation.pendingOrderProposal && (conversation.pendingOrderProposal as any).status === 'AWAITING_CUSTOMER_DETAILS') {
      const proposal = conversation.pendingOrderProposal as any;
      const isExpired = proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now();

      if (!isExpired && proposal.items && Array.isArray(proposal.items) && proposal.items.length > 0) {
        const currentContact = contact || (conversation as any).contact;
        const currentName = currentContact?.name || proposal.customerDetails?.name;
        const currentPhone = currentContact?.phone || phoneToSet || proposal.customerDetails?.phone;
        const currentAddress = currentContact?.address || cd?.address || proposal.customerDetails?.address;
        const currentArea = detectedArea || proposal.deliveryArea || proposal.customerDetails?.deliveryArea;

        const missingFields: string[] = [];
        if (!currentName || currentName.toLowerCase().includes('user') || currentName.toLowerCase().includes('guest')) {
          missingFields.push('আপনার নাম (Full Name)');
        }
        if (!currentPhone || !/^01[3-9]\d{8}$/.test(currentPhone.replace(/\D/g, ''))) {
          missingFields.push('১১ ডিজিটের মোবাইল নম্বর (Mobile Number)');
        }
        if (!currentAddress || currentAddress.trim().length < 5) {
          missingFields.push('সম্পূর্ণ ডেলিভারি ঠিকানা (Detailed Delivery Address)');
        }
        if (!currentArea) {
          missingFields.push('ডেলিভারি লোকেশন (ঢাকার ভেতরে নাকি ঢাকার বাইরে)');
        }

        const itemsListStr = (proposal.items || []).map((i: any) => `${i.quantity || 1}x ${i.name} (৳${i.price})`).join(', ');

        if (missingFields.length > 0) {
          proposal.customerDetails = {
            name: currentName,
            phone: currentPhone,
            address: currentAddress,
            deliveryArea: currentArea
          };
          proposal.missingFields = missingFields;
          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: { pendingOrderProposal: proposal }
          });

          if (phoneToSet || cd?.address || detectedArea || rawUserText.length >= 5) {
            const missingPoints = missingFields.map((f, idx) => `${idx + 1}. ${f}`).join('\n\n');
            return {
              overrideReplyText: `আপনার পছন্দের প্রোডাক্ট:\n📦 ${itemsListStr}\nমোট প্রোডাক্ট মূল্য: ৳${proposal.subtotal}\n\nঅর্ডারটি প্রসেস করার জন্য এখনও নিচের তথ্যগুলো প্রয়োজন:\n\n${missingPoints}\n\nদয়া করে তথ্যগুলো পাঠিয়ে দিন, আমরা সাথে সাথে আপনার অর্ডারটি প্রসেস করব!`
            };
          }
        } else {
          // All 4 required details are now satisfied!
          const area = currentArea || 'inside_dhaka';
          const deliveryCharge = area === 'inside_dhaka' ? chargeInsideDhaka : chargeOutsideDhaka;
          const grandTotal = Number(proposal.subtotal || 0) + deliveryCharge;
          const areaLabelBn = area === 'inside_dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে';

          const customerInfoSummary = {
            name: currentName,
            phone: currentPhone,
            address: currentAddress,
            deliveryArea: area
          };

          const activePolicy = proposal.paymentPolicy || paymentPolicy;

          if (activePolicy === 'cod') {
            const proposalJson = {
              status: 'PROPOSED',
              paymentPolicy: 'cod',
              items: proposal.items,
              subtotal: proposal.subtotal,
              deliveryCharge,
              deliveryArea: area,
              totalAmount: grandTotal,
              advanceAmountRequired: 0,
              dueAmountCod: grandTotal,
              customerDetails: customerInfoSummary,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
            };

            await (this.prisma as any).conversation.update({
              where: { id: conversationId },
              data: { pendingOrderProposal: proposalJson }
            });

            return {
              overrideReplyText: `আমি আপনার অর্ডার প্রপোজাল তৈরি করেছি:\n📦 প্রোডাক্ট: ${itemsListStr}\n🚚 ডেলিভারি চার্জ (${areaLabelBn}): ৳${deliveryCharge}\n💰 সর্বমোট: ৳${grandTotal} (ক্যাশ অন ডেলিভারি)\n\n📍 ডেলিভারি ঠিকানা: ${currentAddress}\n📞 মোবাইল: ${currentPhone}\n\nঅর্ডারটি নিশ্চিত করতে অনুগ্রহ করে 'CONFIRM' অথবা 'YES PLACE ORDER' লিখে মেসেজ করুন।\n\nReply 'CONFIRM' or 'YES PLACE ORDER' to confirm.`
            };
          } else {
            const isFull = activePolicy === 'full_advance';
            const advanceRequired = isFull ? grandTotal : deliveryCharge;
            const dueCod = isFull ? 0 : Number(proposal.subtotal || 0);

            const proposalJson = {
              status: 'AWAITING_PAYMENT_PROOF',
              paymentPolicy: activePolicy,
              items: proposal.items,
              subtotal: proposal.subtotal,
              deliveryCharge,
              deliveryArea: area,
              totalAmount: grandTotal,
              advanceAmountRequired: advanceRequired,
              dueAmountCod: dueCod,
              customerDetails: customerInfoSummary,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            };

            await (this.prisma as any).conversation.update({
              where: { id: conversationId },
              data: { pendingOrderProposal: proposalJson }
            });

            const mfsBullets = mfsAccounts
              .filter((a: any) => a.accountNumber && a.accountNumber.trim())
              .map((a: any) => `• ${a.provider} (${a.accountType}): ${a.accountNumber}`)
              .join('\n');

            const policyText = isFull
              ? `আমাদের পলিসি অনুযায়ী সম্পূর্ণ মূল্য ৳${grandTotal} অগ্রিম বিকাশ/নগদে পরিশোধ করে অর্ডারটি কনফার্ম করতে হবে।`
              : `আমাদের পলিসি অনুযায়ী ডেলিভারি চার্জ ৳${deliveryCharge} অগ্রিম বিকাশ/নগদে পরিশোধ করে অর্ডারটি কনফার্ম করতে হবে। বাকি ৳${proposal.subtotal} প্রোডাক্ট হাতে পেয়ে ক্যাশ অন ডেলিভারি পরিশোধ করবেন।`;

            return {
              overrideReplyText: `আপনার অর্ডার সামারি:\n📦 প্রোডাক্ট: ${itemsListStr}\n💰 প্রোডাক্ট মূল্য: ৳${proposal.subtotal}\n🚚 ডেলিভারি চার্জ (${areaLabelBn}): ৳${deliveryCharge}\n💵 সর্বমোট: ৳${grandTotal}\n\n${policyText}\n\nপেমেন্ট পাঠানোর একাউন্ট:\n${mfsBullets || '• বিকাশ (পার্সোনাল): আমাদের ইনবক্সে যোগাযোগ করুন'}${paymentNote ? `\n📌 ${paymentNote}` : ''}\n\nটাকা পাঠানোর পর ট্রানজেকশনের স্ক্রিনশট দিন। স্ক্রিনশট পেলেই আপনার অর্ডারটি স্বয়ংক্রিয়ভাবে কনফার্ম হয়ে যাবে!`
            };
          }
        }
      }
    }

    // =========================================================================
    // Flow 1: Vision AI Payment Screenshot Verification (Awaiting Payment Proof or Inbound Slip)
    // =========================================================================
    let candidateImagePath = imagePaths && imagePaths.length > 0 ? imagePaths[0] : null;

    if (!candidateImagePath && (conversation as any)?.messages?.[0]?.content) {
      const lastCnt = (conversation as any).messages[0].content;
      const candidate = lastCnt?.localUrl || lastCnt?.localPath || lastCnt?.mediaUrl || lastCnt?.url;
      if (candidate) {
        candidateImagePath = await this.ensureLocalImage(candidate, tenantId);
      }
    }

    if (candidateImagePath && fs.existsSync(candidateImagePath)) {
      const proposal = (conversation.pendingOrderProposal as any) || null;
      const advanceRequired = proposal?.advanceAmountRequired || (paymentPolicy === 'delivery_advance' ? chargeOutsideDhaka : 100);

      this.logger.log(`Verifying payment screenshot for conversation ${conversationId}: ${candidateImagePath}`);
      const verification = await this.aiService.verifyPaymentReceiptScreenshot(
        candidateImagePath,
        advanceRequired
      );

      if (verification.isPaymentReceipt && verification.status !== 'failed') {
        const requiredAmount = proposal?.advanceAmountRequired || (paymentPolicy === 'delivery_advance' ? chargeOutsideDhaka : 100);
        if (verification.paidAmount >= requiredAmount) {
          // Success! Confirm order and create record in Order table
          let itemsToOrder = proposal?.items;
          let deliveryCharge = Number(proposal?.deliveryCharge || 0);
          let deliveryArea = proposal?.deliveryArea || detectedArea || (contact?.address?.toLowerCase()?.includes('ঢাকা') ? 'inside_dhaka' : 'outside_dhaka');

          if (!itemsToOrder || itemsToOrder.length === 0) {
            const recovered = await this.recoverProductAndProposalFromHistory(tenantId, conversationId);
            if (recovered?.items?.length) {
              itemsToOrder = recovered.items;
              deliveryCharge = recovered.deliveryCharge;
              deliveryArea = recovered.deliveryArea;
            }
          }

          const validatedItems: { productId: string; quantity: number; priceAtTime: number }[] = [];
          let grandTotal = 0;

          for (const item of (itemsToOrder || [])) {
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

          if (deliveryCharge === 0) {
            deliveryCharge = deliveryArea === 'inside_dhaka' ? chargeInsideDhaka : chargeOutsideDhaka;
          }
          const totalWithDelivery = grandTotal + deliveryCharge;
          const dueAmount = Math.max(0, totalWithDelivery - verification.paidAmount);
          const policyLabel = paymentPolicy === 'delivery_advance' ? 'Delivery Advance' : 'Full Advance';
          const areaLabel = deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';

          const createdOrder = await this.ordersService.createOrder(tenantId, {
            contactId: conversation.contactId,
            conversationId: conversation.id,
            items: validatedItems.length > 0 ? validatedItems : itemsToOrder,
            notes: `Policy: ${policyLabel} | Paid Advance: ৳${verification.paidAmount} (${verification.provider} TrxID: ${verification.trxId || 'N/A'}) | COD Due: ৳${dueAmount} | Area: ${areaLabel}`
          });

          await (this.prisma as any).order.update({
            where: { id: createdOrder.id },
            data: { createdBy: 'ai', status: 'confirmed' }
          });

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: {
              pendingOrderProposal: null,
              hasOrderRequest: true
            }
          });

          await this.activityLogService.record({
            tenantId,
            conversationId,
            contactId: conversation.contactId,
            type: 'ORDER_CREATED',
            metadataJson: {
              orderId: createdOrder.id,
              source: 'ai_vision_verified',
              trxId: verification.trxId,
              provider: verification.provider,
              paidAmount: verification.paidAmount,
              totalAmount: totalWithDelivery
            }
          });

          const orderNum = createdOrder.id.slice(0, 8);
          const dueMsg = dueAmount > 0
            ? `বাকি ৳${dueAmount} প্রোডাক্ট ডেলিভারির সময় ক্যাশ পরিশোধ করবেন।`
            : `সম্পূর্ণ মূল্য পরিশোধিত হয়েছে।`;

          return {
            overrideReplyText: `ধন্যবাদ! আপনার ৳${verification.paidAmount} পেমেন্ট সফলভাবে ভেরিফাই হয়েছে (${verification.provider}${verification.trxId ? `, TrxID: ${verification.trxId}` : ''})। আপনার অর্ডারটি কনফার্ম করা হয়েছে (অর্ডার নম্বর: #${orderNum})। ${dueMsg}\n\nThank you! Your payment of BDT ${verification.paidAmount} has been verified (${verification.provider}${verification.trxId ? `, TrxID: ${verification.trxId}` : ''}). Your order has been placed (Order #${orderNum}).`
          };
        } else {
          // Partial payment / underpaid
          const remaining = requiredAmount - verification.paidAmount;
          return {
            overrideReplyText: `আপনার স্ক্রিনশট পেয়েছি, তবে আপনি ৳${verification.paidAmount} পাঠিয়েছেন। আমাদের পলিসি অনুযায়ী প্রয়োজনীয় অগ্রিম ৳${requiredAmount}। অনুগ্রহ করে বাকি ৳${remaining} পরিশোধ করে স্ক্রিনশট দিন।\n\nReceived BDT ${verification.paidAmount}. Required advance is BDT ${requiredAmount}. Please send remaining BDT ${remaining} and share screenshot.`
          };
        }
      } else if (proposal?.status === 'AWAITING_PAYMENT_PROOF') {
        // Unclear or not a payment screenshot
        return {
          overrideReplyText: `স্ক্রিনশটটি স্পষ্ট নয় বা পেমেন্টের তথ্য পড়া যায়নি। অনুগ্রহ করে বিকাশ/নগদ সফল পেমেন্টের স্পষ্ট স্ক্রিনশট অথবা ট্রানজেকশন আইডি দিন।\n\nThe screenshot is unclear or payment details could not be verified. Please provide a clear payment screenshot or Transaction ID.`
        };
      }
    }

    // =========================================================================
    // Flow 1.2: Text-based Transaction ID submission
    // =========================================================================
    const trxMatch = rawTextLower.match(/(?:trx|trxid|transaction|txnid|ট্রানজেকশন|আইডি)[\s:]*([A-Za-z0-9]{6,16})/i) ||
                     rawTextLower.match(/\b([A-Z0-9]{8,12})\b/);
    const hasPaymentClaim = ['paid', 'টাকা পাঠিয়েছি', 'পেমেন্ট করেছি', 'পাঠাইছি', 'send', 'sent', 'done'].some(kw => rawTextLower.includes(kw));

    if (trxMatch && (hasPaymentClaim || rawTextLower.includes('trx') || rawTextLower.includes('ট্রানজেকশন'))) {
      const trxId = trxMatch[1];
      this.logger.log(`Customer submitted text TrxID for conversation ${conversationId}: ${trxId}`);
      
      const proposal = (conversation.pendingOrderProposal as any) || null;
      let itemsToOrder = proposal?.items;
      let deliveryCharge = Number(proposal?.deliveryCharge || 0);
      let deliveryArea = proposal?.deliveryArea || detectedArea || 'outside_dhaka';

      if (!itemsToOrder || itemsToOrder.length === 0) {
        const recovered = await this.recoverProductAndProposalFromHistory(tenantId, conversationId);
        if (recovered?.items?.length) {
          itemsToOrder = recovered.items;
          deliveryCharge = recovered.deliveryCharge;
          deliveryArea = recovered.deliveryArea;
        }
      }

      const validatedItems: { productId: string; quantity: number; priceAtTime: number }[] = [];
      let grandTotal = 0;

      for (const item of (itemsToOrder || [])) {
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

      if (deliveryCharge === 0) {
        deliveryCharge = deliveryArea === 'inside_dhaka' ? chargeInsideDhaka : chargeOutsideDhaka;
      }
      const totalWithDelivery = grandTotal + deliveryCharge;
      const dueAmount = proposal?.paymentPolicy === 'delivery_advance' ? grandTotal : 0;
      const policyLabel = proposal?.paymentPolicy === 'delivery_advance' ? 'Delivery Advance' : 'Advance Payment';
      const areaLabel = deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';

      if (validatedItems.length > 0 || (itemsToOrder && itemsToOrder.length > 0)) {
        const createdOrder = await this.ordersService.createOrder(tenantId, {
          contactId: conversation.contactId,
          conversationId: conversation.id,
          items: validatedItems.length > 0 ? validatedItems : itemsToOrder,
          notes: `Policy: ${policyLabel} | Paid Advance via TrxID: ${trxId} | COD Due: ৳${dueAmount} | Area: ${areaLabel}`
        });

        await (this.prisma as any).order.update({
          where: { id: createdOrder.id },
          data: { createdBy: 'ai', status: 'confirmed' }
        });

        await (this.prisma as any).conversation.update({
          where: { id: conversationId },
          data: {
            pendingOrderProposal: null,
            hasOrderRequest: true
          }
        });

        await this.activityLogService.record({
          tenantId,
          conversationId,
          contactId: conversation.contactId,
          type: 'ORDER_CREATED',
          metadataJson: {
            orderId: createdOrder.id,
            source: 'ai_text_trx_verified',
            trxId,
            totalAmount: totalWithDelivery
          }
        });

        const orderNum = createdOrder.id.slice(0, 8);
        const dueMsg = dueAmount > 0
          ? `বাকি ৳${dueAmount} প্রোডাক্ট ডেলিভারির সময় ক্যাশ পরিশোধ করবেন।`
          : `সম্পূর্ণ মূল্য পরিশোধিত হয়েছে।`;

        return {
          overrideReplyText: `ধন্যবাদ! আপনার ট্রানজেকশন আইডি (${trxId}) গ্রহণ করা হয়েছে এবং অর্ডারটি কনফার্ম করা হয়েছে (অর্ডার নম্বর: #${orderNum})। ${dueMsg}\n\nThank you! Your Transaction ID (${trxId}) has been received and your order has been placed (Order #${orderNum}).`
        };
      }
    }

    // =========================================================================
    // Flow 1.8: AI LLM Confirmation Failsafe
    // If the LLM generated a reply asserting payment verification or order confirmation,
    // but no order was created yet in Flow 1/1.2, create the order from proposal or history!
    // This strictly prevents the disaster of AI confirming to customer while DB has 0 orders.
    // =========================================================================
    const confirmationPhrases = [
      'অর্ডারটি কনফার্ম', 'অর্ডার কনফার্ম', 'পেমেন্ট সফলভাবে যাচাই', 'পেমেন্ট নিশ্চিত',
      'অর্ডার নিশ্চিত', 'order confirmed', 'order has been confirmed', 'order has been placed'
    ];
    const replyContainsConfirmation = confirmationPhrases.some(phrase =>
      classification.replyText?.toLowerCase().includes(phrase)
    );

    if (replyContainsConfirmation) {
      let proposal = conversation.pendingOrderProposal as any;
      let itemsToUse = proposal?.items;

      if (!itemsToUse || itemsToUse.length === 0) {
        const recovered = await this.recoverProductAndProposalFromHistory(tenantId, conversationId);
        if (recovered?.items?.length) {
          itemsToUse = recovered.items;
          proposal = {
            ...proposal,
            items: recovered.items,
            deliveryArea: recovered.deliveryArea,
            deliveryCharge: recovered.deliveryCharge
          };
        }
      }

      if (itemsToUse && Array.isArray(itemsToUse) && itemsToUse.length > 0) {
        this.logger.log(`LLM asserted order confirmation for conversation ${conversationId}. Executing failsafe order creation.`);

        const validatedItems: { productId: string; quantity: number; priceAtTime: number }[] = [];
        let grandTotal = 0;

        for (const item of itemsToUse) {
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

        const deliveryCharge = Number(proposal?.deliveryCharge || (proposal?.deliveryArea === 'outside_dhaka' ? chargeOutsideDhaka : chargeInsideDhaka));
        const totalWithDelivery = grandTotal + deliveryCharge;
        const dueAmount = proposal?.paymentPolicy === 'delivery_advance' ? grandTotal : 0;
        const policyLabel = proposal?.paymentPolicy === 'delivery_advance' ? 'Delivery Advance' : (proposal?.paymentPolicy === 'full_advance' ? 'Full Advance' : 'Cash on Delivery');
        const areaLabel = proposal?.deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';

        const createdOrder = await this.ordersService.createOrder(tenantId, {
          contactId: conversation.contactId,
          conversationId: conversation.id,
          items: validatedItems.length > 0 ? validatedItems : itemsToUse,
          notes: `Policy: ${policyLabel} | Total: ৳${totalWithDelivery} | COD Due: ৳${dueAmount} | Area: ${areaLabel} | Source: AI Confirmation Safeguard`
        });

        await (this.prisma as any).order.update({
          where: { id: createdOrder.id },
          data: { createdBy: 'ai', status: 'confirmed' }
        });

        await (this.prisma as any).conversation.update({
          where: { id: conversationId },
          data: {
            pendingOrderProposal: null,
            hasOrderRequest: true
          }
        });

        await this.activityLogService.record({
          tenantId,
          conversationId,
          contactId: conversation.contactId,
          type: 'ORDER_CREATED',
          metadataJson: {
            orderId: createdOrder.id,
            source: 'ai_confirmation_failsafe',
            totalAmount: totalWithDelivery
          }
        });

        const orderNum = createdOrder.id.slice(0, 8);
        const replyWithOrderNum = classification.replyText.includes(orderNum)
          ? classification.replyText
          : `${classification.replyText}\n\n(অর্ডার নম্বর: #${orderNum})`;

        return {
          overrideReplyText: replyWithOrderNum
        };
      }
    }

    // =========================================================================
    // Flow 2: Customer confirms an existing order proposal (COD confirmation)
    // =========================================================================
    if (classification.intent === 'order_confirmation' && conversation.pendingOrderProposal) {
      const proposal = conversation.pendingOrderProposal as any;
      const isExpired = proposal.expiresAt && new Date(proposal.expiresAt).getTime() < Date.now();

      if (!isExpired && proposal.items && Array.isArray(proposal.items) && proposal.items.length > 0) {
        if (proposal.status === 'AWAITING_PAYMENT_PROOF') {
          const mfsList = mfsAccounts
            .filter((a: any) => a.accountNumber && a.accountNumber.trim())
            .map((a: any) => `• ${a.provider} (${a.accountType}): ${a.accountNumber}`)
            .join('\n');
          return {
            overrideReplyText: `আপনার অর্ডারটি নিশ্চিত করতে অনুগ্রহ করে ৳${proposal.advanceAmountRequired} অগ্রিম পরিশোধ করে ট্রানজেকশনের স্ক্রিনশট দিন।\n\nপেমেন্ট একাউন্ট:\n${mfsList || '• বিকাশ (পার্সোনাল): 01XXXXXXXXX'}`
          };
        }

        // Strict Hard Confirmation Validation
        const hardConfirmations = ['confirm', 'yes place order', 'confirm order', 'হ্যাঁ অর্ডার কনফার্ম', 'অর্ডার কনফার্ম', 'অর্ডার নিশ্চিত করুন', 'কনফার্ম'];
        const isHardConfirmed = hardConfirmations.some(kw => rawTextLower.includes(kw));

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

        const deliveryCharge = Number(proposal.deliveryCharge || 0);
        const finalTotal = grandTotal + deliveryCharge;
        const areaLabel = proposal.deliveryArea === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka';

        if (validatedItems.length > 0) {
          const createdOrder = await this.ordersService.createOrder(tenantId, {
            contactId: conversation.contactId,
            conversationId: conversation.id,
            items: validatedItems,
            notes: `Policy: Cash on Delivery (COD) | Delivery Charge: ৳${deliveryCharge} | Total: ৳${finalTotal} | Area: ${areaLabel}`
          });

          await (this.prisma as any).order.update({
            where: { id: createdOrder.id },
            data: { createdBy: 'ai', status: 'confirmed' }
          });

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: {
              pendingOrderProposal: null,
              hasOrderRequest: true
            }
          });

          await this.activityLogService.record({
            tenantId,
            conversationId,
            contactId: conversation.contactId,
            type: 'ORDER_CREATED',
            metadataJson: { orderId: createdOrder.id, source: 'ai_cod', totalAmount: finalTotal }
          });

          const orderNum = createdOrder.id.slice(0, 8);
          return {
            overrideReplyText: `ধন্যবাদ! আপনার ক্যাশ অন ডেলিভারি অর্ডারটি নিশ্চিত করা হয়েছে (অর্ডার নম্বর: #${orderNum})। মোট মূল্য: BDT ${finalTotal} (ডেলিভারি চার্জ সহ)। ডেলিভারির সময় সম্পূর্ণ টাকা ক্যাশ পরিশোধ করবেন।\n\nThank you! Your Cash on Delivery order has been confirmed (Order #${orderNum}). Total: BDT ${finalTotal}.`
          };
        }
      }

      // Proposal expired or invalid
      await (this.prisma as any).conversation.update({
        where: { id: conversationId },
        data: { pendingOrderProposal: null }
      });
    }

    // =========================================================================
    // Flow 3: New order intent proposed by customer
    // =========================================================================
    if (classification.intent === 'order_intent' && classification.orderProposal && classification.orderProposal.length > 0) {
      const proposalItems: { productId: string; name: string; price: number; quantity: number }[] = [];
      let totalAmount = 0;

      for (const item of classification.orderProposal) {
        if (!item.productNameGuess) continue;

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
        // Step 1: Check required 4 customer details
        const missingFields: string[] = [];
        const currentContact = contact || (conversation as any).contact;
        const currentName = currentContact?.name;
        const currentPhone = currentContact?.phone || phoneToSet;
        const currentAddress = currentContact?.address || cd?.address;
        const currentArea = detectedArea || (conversation.pendingOrderProposal as any)?.deliveryArea;

        if (!currentName || currentName.toLowerCase().includes('user') || currentName.toLowerCase().includes('guest')) {
          missingFields.push('আপনার নাম (Full Name)');
        }
        if (!currentPhone || !/^01[3-9]\d{8}$/.test(currentPhone.replace(/\D/g, ''))) {
          missingFields.push('১১ ডিজিটের মোবাইল নম্বর (Mobile Number)');
        }
        if (!currentAddress || currentAddress.trim().length < 5) {
          missingFields.push('সম্পূর্ণ ডেলিভারি ঠিকানা (Detailed Delivery Address)');
        }
        if (!currentArea) {
          missingFields.push('ডেলিভারি লোকেশন (ঢাকার ভেতরে নাকি ঢাকার বাইরে)');
        }

        const itemsListStr = proposalItems.map(i => `${i.quantity}x ${i.name} (৳${i.price})`).join(', ');

        // If information is missing, save draft proposal and ask for missing details
        if (missingFields.length > 0) {
          const proposalJson = {
            status: 'AWAITING_CUSTOMER_DETAILS',
            paymentPolicy,
            items: proposalItems,
            subtotal: totalAmount,
            missingFields,
            customerDetails: {
              name: currentName,
              phone: currentPhone,
              address: currentAddress,
              deliveryArea: currentArea
            },
            expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          };

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: { pendingOrderProposal: proposalJson }
          });

          const missingPoints = missingFields.map((f, idx) => `${idx + 1}. ${f}`).join('\n\n');
          return {
            overrideReplyText: `আপনার পছন্দের প্রোডাক্ট:\n📦 ${itemsListStr}\nমোট প্রোডাক্ট মূল্য: ৳${totalAmount}\n\nঅর্ডারটি প্রসেস করার জন্য অনুগ্রহ করে নিচের তথ্যগুলো দিন:\n\n${missingPoints}\n\nদয়া করে তথ্যগুলো পাঠিয়ে দিন, আমরা সাথে সাথে আপনার অর্ডারটি প্রসেস করব!`
          };
        }

        // Step 2: All 4 details are present! Calculate delivery charge & apply policy
        const area = currentArea || 'inside_dhaka';
        const deliveryCharge = area === 'inside_dhaka' ? chargeInsideDhaka : chargeOutsideDhaka;
        const grandTotal = totalAmount + deliveryCharge;
        const areaLabelBn = area === 'inside_dhaka' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে';

        const customerInfoSummary = {
          name: currentName,
          phone: currentPhone,
          address: currentAddress,
          deliveryArea: area
        };

        // Track CAPI Hub Intent (Purchase)
        this.capiHubService.fireEvent(tenantId, 'Purchase', {
          event_source_url: 'inbox_ai',
          user_data: {
            em: currentContact?.email || undefined,
            ph: currentPhone || undefined,
            fn: currentName || undefined
          },
          custom_data: {
            value: grandTotal,
            currency: 'BDT',
            content_ids: proposalItems.map(i => i.productId)
          }
        }, 'inbox_ai').catch(err => this.logger.warn(`Failed to track CAPI Hub event for inbox_ai: ${err.message}`));

        if (paymentPolicy === 'cod') {
          // COD Policy
          const proposalJson = {
            status: 'PROPOSED',
            paymentPolicy: 'cod',
            items: proposalItems,
            subtotal: totalAmount,
            deliveryCharge,
            deliveryArea: area,
            totalAmount: grandTotal,
            advanceAmountRequired: 0,
            dueAmountCod: grandTotal,
            customerDetails: customerInfoSummary,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
          };

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: { pendingOrderProposal: proposalJson }
          });

          return {
            overrideReplyText: `আমি আপনার অর্ডার প্রপোজাল তৈরি করেছি:\n📦 প্রোডাক্ট: ${itemsListStr}\n🚚 ডেলিভারি চার্জ (${areaLabelBn}): ৳${deliveryCharge}\n💰 সর্বমোট: ৳${grandTotal} (ক্যাশ অন ডেলিভারি)\n\n📍 ডেলিভারি ঠিকানা: ${currentAddress}\n📞 মোবাইল: ${currentPhone}\n\nঅর্ডারটি নিশ্চিত করতে অনুগ্রহ করে 'CONFIRM' অথবা 'YES PLACE ORDER' লিখে মেসেজ করুন।\n\nReply 'CONFIRM' or 'YES PLACE ORDER' to confirm.`
          };
        } else if (paymentPolicy === 'delivery_advance') {
          // Delivery Charge Advance Policy
          const proposalJson = {
            status: 'AWAITING_PAYMENT_PROOF',
            paymentPolicy: 'delivery_advance',
            items: proposalItems,
            subtotal: totalAmount,
            deliveryCharge,
            deliveryArea: area,
            totalAmount: grandTotal,
            advanceAmountRequired: deliveryCharge,
            dueAmountCod: totalAmount,
            customerDetails: customerInfoSummary,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          };

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: { pendingOrderProposal: proposalJson }
          });

          const mfsBullets = mfsAccounts
            .filter((a: any) => a.accountNumber && a.accountNumber.trim())
            .map((a: any) => `• ${a.provider} (${a.accountType}): ${a.accountNumber}`)
            .join('\n');

          return {
            overrideReplyText: `আপনার অর্ডার সামারি:\n📦 প্রোডাক্ট: ${itemsListStr}\n💰 প্রোডাক্ট মূল্য: ৳${totalAmount}\n🚚 ডেলিভারি চার্জ (${areaLabelBn}): ৳${deliveryCharge}\n💵 সর্বমোট: ৳${grandTotal}\n\nআমাদের পলিসি অনুযায়ী ডেলিভারি চার্জ ৳${deliveryCharge} অগ্রিম বিকাশ/নগদে পরিশোধ করে অর্ডারটি কনফার্ম করতে হবে। বাকি ৳${totalAmount} প্রোডাক্ট হাতে পেয়ে ক্যাশ অন ডেলিভারি পরিশোধ করবেন।\n\nপেমেন্ট পাঠানোর একাউন্ট:\n${mfsBullets || '• বিকাশ (পার্সোনাল): আমাদের ইনবক্সে যোগাযোগ করুন'}${paymentNote ? `\n📌 ${paymentNote}` : ''}\n\nটাকা পাঠানোর পর ট্রানজেকশনের স্ক্রিনশট দিন। স্ক্রিনশট পেলেই আপনার অর্ডারটি স্বয়ংক্রিয়ভাবে কনফার্ম হয়ে যাবে!`
          };
        } else if (paymentPolicy === 'full_advance') {
          // Full Advance Payment Policy
          const proposalJson = {
            status: 'AWAITING_PAYMENT_PROOF',
            paymentPolicy: 'full_advance',
            items: proposalItems,
            subtotal: totalAmount,
            deliveryCharge,
            deliveryArea: area,
            totalAmount: grandTotal,
            advanceAmountRequired: grandTotal,
            dueAmountCod: 0,
            customerDetails: customerInfoSummary,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          };

          await (this.prisma as any).conversation.update({
            where: { id: conversationId },
            data: { pendingOrderProposal: proposalJson }
          });

          const mfsBullets = mfsAccounts
            .filter((a: any) => a.accountNumber && a.accountNumber.trim())
            .map((a: any) => `• ${a.provider} (${a.accountType}): ${a.accountNumber}`)
            .join('\n');

          return {
            overrideReplyText: `আপনার অর্ডার সামারি:\n📦 প্রোডাক্ট: ${itemsListStr}\n💰 প্রোডাক্ট মূল্য: ৳${totalAmount}\n🚚 ডেলিভারি চার্জ (${areaLabelBn}): ৳${deliveryCharge}\n💵 সর্বমোট: ৳${grandTotal}\n\nআমাদের পলিসি অনুযায়ী সম্পূর্ণ মূল্য ৳${grandTotal} অগ্রিম বিকাশ/নগদে পরিশোধ করে অর্ডারটি কনফার্ম করতে হবে।\n\nপেমেন্ট পাঠানোর একাউন্ট:\n${mfsBullets || '• বিকাশ (পার্সোনাল): আমাদের ইনবক্সে যোগাযোগ করুন'}${paymentNote ? `\n📌 ${paymentNote}` : ''}\n\nটাকা পাঠানোর পর ট্রানজেকশনের স্ক্রিনশট দিন। স্ক্রিনশট পেলেই আপনার অর্ডারটি স্বয়ংক্রিয়ভাবে কনফার্ম হয়ে যাবে!`
          };
        }
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
    minConfidence: number = 0.6,
    maxProductsToSend: number = 10,
    assistantId?: string,
    userText?: string
  ) {
    const maxPhotos = Math.min(Math.max(maxProductsToSend || 10, 1), 10);
    const searchQuery = classification.imageProductDescription;
    const isExplicitPhotoLookup = classification.intent === 'product_lookup';
    const hasExplicitPhotoIds = Array.isArray(classification.sendProductPhotoIds) && classification.sendProductPhotoIds.length > 0;

    // Clean user query text to strip system wrappers like [Image Sent by Customer] or [Image Sent] Caption:
    const rawUserText = userText || '';
    const isCustomerInboundImage = rawUserText.includes('[Image Sent');
    const cleanUserQuery = rawUserText
      .replace(/^\[Image Sent(?: by Customer)?\](?:\s*Caption:\s*)?/i, '')
      .trim();
    const lowerUserText = cleanUserQuery.toLowerCase();

    // RULE 1: If the inbound message was an IMAGE sent by the customer:
    // The customer is SHOWING an item to the business. They did NOT ask for a blast of 5 catalog photos!
    // Real human behavior: The assistant discusses the photo in text (replyText) and does NOT dump catalog photos.
    // Photos should ONLY be dispatched if the customer explicitly demanded photos in their caption/message!
    const explicitPhotoRequest = [
      'ছবি পাঠান', 'ছবি দিন', 'ছবি দেন', 'ছবি দেখান', 'আরও ছবি', 'আর ছবি', 'বাকি ছবি', 'অন্য কালার', 'অন্যান্য কালার',
      'send photo', 'send photos', 'send pic', 'send pics', 'show photo', 'show photos', 'send more', 'show more pictures'
    ].some(k => lowerUserText.includes(k));

    if (isCustomerInboundImage && !explicitPhotoRequest) {
      this.logger.log(`Skipping product photo matching for conversation ${conversationId}: Customer sent an inbound image without explicit photo request. Human-like discussion will be handled via replyText.`);
      return;
    }

    // RULE 2: Never dispatch photos during order placement / buying intent ("নিব / অর্ডার করব / confirm")
    // If the customer is ordering, buying, or confirming, their goal is checkout, NOT receiving photos!
    const isOrdering = ['order_intent', 'order_confirmation'].includes(classification.intent);
    const orderKeywords = ['নিব', 'নিতে চাই', 'অর্ডার', 'কিনব', 'কিনতে চাই', 'order', 'buy', 'confirm'];
    const isOrderAction = isOrdering || orderKeywords.some(k => lowerUserText.includes(k));

    if (isOrderAction && !explicitPhotoRequest) {
      this.logger.log(`Skipping product photo matching for conversation ${conversationId}: Customer is in ordering flow without explicit photo request.`);
      return;
    }

    // Check if user text asked for photos, catalog or product list
    const photoOrListTerms = [
      'ছবি', 'photo', 'photos', 'pic', 'pics', 'picture', 'pictures',
      'লিস্ট', 'তালিকা', 'list', 'catalog', 'ক্যাটালগ', 'collection', 'কালেকশন', 'সবগুলো',
      'কি কি আছে', 'কী কী আছে', 'what do you have', 'show'
    ];
    const isPhotoOrListInquiry = photoOrListTerms.some(term => lowerUserText.includes(term));

    if (!searchQuery && !isExplicitPhotoLookup && !hasExplicitPhotoIds && !isPhotoOrListInquiry) {
      return;
    }

    // Search tenant product catalog for active products with photos
    const allProductsWithImages = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        imageUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (allProductsWithImages.length === 0) return;

    let matchedProducts: any[] = [];

    // Strategy 1: Explicit IDs chosen by AI Stage A classification
    if (hasExplicitPhotoIds) {
      const explicitIds = classification.sendProductPhotoIds!;
      for (const id of explicitIds) {
        const found = allProductsWithImages.find(p => p.id === id || p.id.startsWith(id));
        if (found && !matchedProducts.some(m => m.id === found.id)) {
          matchedProducts.push(found);
        }
      }
    }

    // Strategy 2: If explicit IDs didn't yield enough, or not provided:
    // Search by relevance tokens from searchQuery, userText, and classification.replyText
    let moderateMatch: any = null;
    let bestScore = 0;

    if (matchedProducts.length === 0) {
      const queryStr = searchQuery || (isPhotoOrListInquiry ? userText : classification.replyText) || '';
      const qTokens = queryStr.toLowerCase()
        .replace(/[^\w\s\u0980-\u09FF]/gi, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !['the', 'and', 'for', 'you', 'have', 'what', 'price', 'cost', 'dam', 'koto', 'naki', 'ache', 'apnader', 'আপনাদের', 'ছবি', 'photo', 'photos', 'image'].includes(t));

      if (qTokens.length > 0) {
        const scoredProducts: { product: any; score: number }[] = [];

        for (const p of allProductsWithImages) {
          const pText = `${p.name} ${p.description || ''} ${JSON.stringify(p.attributes || {})}`.toLowerCase();
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
            if (score >= 0.6 && score < minConfidence) {
              moderateMatch = p;
            }
          }
          if (score >= minConfidence) {
            scoredProducts.push({ product: p, score });
          }
        }

        // Sort by score descending
        scoredProducts.sort((a, b) => b.score - a.score);
        matchedProducts = scoredProducts.map(s => s.product);
      }
    }

    // Moderate confidence clarifying question (60% - 79%): Only if no high-confidence matches and not a general list/catalog inquiry
    if (matchedProducts.length === 0 && moderateMatch && !isPhotoOrListInquiry && searchQuery) {
      const priceStr = (!moderateMatch.price || Number(moderateMatch.price) <= 0) ? 'Price on Request' : `BDT ${moderateMatch.price}`;
      await this.inboxService.saveOutboundMessage(
        tenantId,
        conversationId,
        `আপনি কি '${moderateMatch.name}' প্রোডাক্টটি খুঁজছেন? (মূল্য: BDT ${moderateMatch.price})\n\nAre you looking for '${moderateMatch.name}' (Price: BDT ${moderateMatch.price})? Please confirm so I can share details.`
      );
      return;
    }

    // Strategy 3: If customer specifically asked for product list, catalog or photos ("লিস্ট", "ছবি", "catalog"),
    // but specific keyword score was 0 (e.g. "আপনাদের সব প্রোডাক্টের ছবি দেখান"):
    // Take top available products with photos up to maxPhotos!
    if (matchedProducts.length === 0 && (isPhotoOrListInquiry || isExplicitPhotoLookup)) {
      matchedProducts = allProductsWithImages.slice(0, maxPhotos);
    }

    // RULE 2: Photo Deduplication Check Against Conversation History
    // "একবার পাঠালে ওই একই ইমেজ আর পাঠাবে না"
    const sentImageMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        type: 'image'
      },
      select: {
        content: true
      }
    });

    const alreadySentProductIds = new Set<string>();
    const alreadySentMediaUrls = new Set<string>();

    for (const msg of sentImageMessages) {
      if (typeof msg.content === 'string') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.productId) alreadySentProductIds.add(String(parsed.productId));
          if (parsed.mediaUrl) alreadySentMediaUrls.add(String(parsed.mediaUrl));
        } catch {
          if (msg.content.includes('"productId"')) {
            const m = msg.content.match(/"productId"\s*:\s*"?([^",\s}]+)"?/);
            if (m) alreadySentProductIds.add(m[1]);
          }
          if (msg.content.includes('"mediaUrl"')) {
            const m = msg.content.match(/"mediaUrl"\s*:\s*"([^"]+)"/);
            if (m) alreadySentMediaUrls.add(m[1]);
          }
        }
      }
    }

    // RULE 3: Resend ONLY on explicit, insistent customer demand ("খুব জোর করে চাইলে তবেই দিন")
    const isExplicitResendDemand = ['আবার পাঠান', 'আবার দিন', 'আরেকবার দিন', 'আরেকবার পাঠান', 'আবার দেখান', 'আরেকবার দেখান', 'send again', 'resend', 'show again'].some(k => lowerUserText.includes(k));

    // Filter out products that have already been sent to this customer unless explicitly demanded
    let productsToDispatch = matchedProducts;
    if (!isExplicitResendDemand && (alreadySentProductIds.size > 0 || alreadySentMediaUrls.size > 0)) {
      productsToDispatch = matchedProducts.filter(p => !alreadySentProductIds.has(String(p.id)) && (!p.imageUrl || !alreadySentMediaUrls.has(String(p.imageUrl))));
    }

    // Limit to configured maxProductsToSend (1 to 10)
    const finalProductsToSend = productsToDispatch.slice(0, maxPhotos);

    if (finalProductsToSend.length > 0) {
      this.logger.log(`Dispatching ${finalProductsToSend.length} product photo(s) (limit: ${maxPhotos}) to conversation ${conversationId}`);

      for (const product of finalProductsToSend) {
        const priceStr = (!product.price || Number(product.price) <= 0) ? 'Price on Request' : `BDT ${product.price}`;
        await this.inboxService.saveOutboundMessage(
          tenantId,
          conversationId,
          JSON.stringify({
            mediaUrl: product.imageUrl,
            body: `📸 ${product.name} — ${priceStr}`,
            productId: product.id,
            productName: product.name,
            productPrice: Number(product.price) || 0
          }),
          'image',
          undefined,
          assistantId
        );
      }

      await this.activityLogService.record({
        tenantId,
        conversationId,
        type: 'PRODUCT_MATCH_SENT',
        metadataJson: {
          productCount: finalProductsToSend.length,
          productIds: finalProductsToSend.map(p => p.id),
          productNames: finalProductsToSend.map(p => p.name)
        }
      });
    }
  }

  private async buildContextPrompt(
    conversationId: string,
    assistant: any,
    options?: {
      isImage: boolean;
      caption: string;
      isOrderPlacementActive: boolean;
      orderPlacementConfig?: any;
      isSupportDetectionActive: boolean;
      isPropertyMode?: boolean;
      isHospitalityMode?: boolean;
      isTechSoftwareMode?: boolean;
      isFinancialServiceMode?: boolean;
      isHealthcareMode?: boolean;
      isEducationMode?: boolean;
      isManufacturingMode?: boolean;
      isLogisticsMode?: boolean;
      retrievedProducts?: any[];
      retrievedQnas?: any[];
      retrievedChunks?: any[];
    }
  ): Promise<string> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { contact: { include: { stage: true } }, tenant: true }
    });

    if (!conversation) return assistant.systemPrompt || '';

    let products = options?.retrievedProducts;
    if (products === undefined) {
      products = await this.prisma.product.findMany({
        where: { tenantId: conversation.tenantId, isActive: true },
        take: 50
      });
    }

    let qnaItems = options?.retrievedQnas;
    if (qnaItems === undefined) {
      qnaItems = await this.prisma.qnAKnowledgeBase.findMany({
        where: { tenantId: conversation.tenantId, isActive: true },
        take: 20
      });
    }

    let retrievedChunks = options?.retrievedChunks;
    if (retrievedChunks === undefined) {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const freshDocs = await this.prisma.knowledgeDocument.findMany({
        where: {
          tenantId: conversation.tenantId,
          status: 'completed',
          uploadedAt: { gte: sixtyDaysAgo }
        },
        include: { chunks: { take: 10 } },
        take: 5
      });
      retrievedChunks = freshDocs.flatMap(d => d.chunks);
    }

    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const activeTags = await this.prisma.label.findMany({
      where: { tenantId: conversation.tenantId, isActive: true }
    });

    // =========================================================================
    // SECTION 1: STATIC HEADER (100% STATIC PER TENANT - OPTIMIZED FOR PROMPT CACHING)
    // =========================================================================
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

    // =========================================================================
    // MANDATORY MULTILINGUAL & SAME-LANGUAGE REPLY DIRECTIVE
    // =========================================================================
    prompt += `\n=== MANDATORY MULTILINGUAL & SAME-LANGUAGE REPLY DIRECTIVE ===\n`;
    prompt += `1. DETECT CUSTOMER LANGUAGE: You MUST identify the language of the customer's incoming message (e.g., German, English, Bengali, Arabic, Spanish, French, Hindi, Banglish, etc.).\n`;
    prompt += `2. STRICT SAME-LANGUAGE OUTPUT: You MUST compose "replyText" in the EXACT SAME language used by the customer in their message. If the customer messages in German, you MUST reply in German. If the customer messages in English, reply in English. If in Bengali, reply in Bengali. If in Arabic, reply in Arabic. If in Banglish (Bengali in English characters), reply in Banglish or Bengali.\n`;
    prompt += `3. NEVER DEFAULT TO BENGALI OR ENGLISH: If the customer messaged in another language (e.g., German, French, Spanish, Arabic, etc.), NEVER reply in Bengali or English. Even if the business catalog, Q&As, website summary, or instructions are written in Bengali or English, you MUST translate all facts, options, and answers seamlessly into the customer's language.\n`;
    prompt += `4. PRESERVE BRAND & PRODUCT IDENTIFIERS: Specific brand names, model numbers, and technical terms may remain as stated, but all greetings, conversational sentences, and explanations MUST be in the customer's detected language.\n`;
    prompt += `VIOLATION OF THIS LANGUAGE DIRECTIVE IS STRICTLY FORBIDDEN.\n`;

    // =========================================================================
    // CRITICAL CONVERSATION CONTINUITY RULE (applies to ALL messages)
    // =========================================================================
    prompt += `\n=== CRITICAL CONVERSATION CONTINUITY RULE ===\n`;
    prompt += `If the customer's current message is a SHORT REPLY, ACKNOWLEDGMENT, or CONTINUATION such as:\n`;
    prompt += `  Bengali: "হ্যাঁ", "না", "জি", "ঠিক আছে", "আচ্ছা", "জানতে চাই", "জানতে চাই না", "বলুন", "হুম", "হ্যাঁ বলুন", "বলুন না", "ওকে", "ঠিকাছে"\n`;
    prompt += `  English: "yes", "no", "ok", "sure", "okay", "go ahead", "tell me", "continue", "please", "i want to know", "i don't want to know"\n`;
    prompt += `THEN you MUST:\n`;
    prompt += `1. READ the CONVERSATION HISTORY section carefully (below) to identify the PREVIOUS AI question or offer.\n`;
    prompt += `2. CONTINUE EXACTLY in that same topic, flow, and context — NEVER reset or start a new topic.\n`;
    prompt += `3. If customer said YES / affirmative → provide the information/details/next step that was offered in your last message.\n`;
    prompt += `4. If customer said NO / negative → acknowledge politely and ask how else you may assist.\n`;
    prompt += `5. NEVER respond as if you have lost track of the conversation or don't know what the customer is referring to.\n`;
    prompt += `VIOLATION OF THIS RULE IS NOT ALLOWED.\n`;

    // =========================================================================
    // MANDATORY QUOTED MESSAGE & REFERENCED PRODUCT DIRECTIVE
    // =========================================================================
    prompt += `\n=== MANDATORY QUOTED MESSAGE & REFERENCED PRODUCT DIRECTIVE ===\n`;
    prompt += `When the customer quotes a message or photo (e.g., "[Replying to Product/Message: ...]" or "[Quoting: ...]") or asks about an item using demonstratives (e.g. "এইটার দাম কত?", "দাম কত?", "এটা সাইজ কি কি আছে?", "এটা নিব", "কত দাম", "how much is this?", "price of this?"):\n`;
    prompt += `1. Look directly at the quoted product or the recent product photo listed in CONVERSATION HISTORY.\n`;
    prompt += `2. IMMEDIATELY identify that exact product from the PRODUCT CATALOG below.\n`;
    prompt += `3. State its EXACT price, stock availability, and available options/sizes directly.\n`;
    prompt += `4. If the customer indicates purchase intent ("এটা নিব", "অর্ডার করব", "how to buy"), guide them directly to complete the order for that specific product.\n`;
    prompt += `5. NEVER ask the customer "Which product are you talking about?" or "Please tell me the product name" when a product was just quoted or presented in the immediately preceding messages.\n`;
    prompt += `VIOLATION OF THIS DIRECTIVE IS STRICTLY FORBIDDEN.\n`;

    // =========================================================================
    // MANDATORY PRODUCT CATALOG PRESENTATION & MULTI-PRODUCT DIRECTIVE
    // =========================================================================
    prompt += `\n=== MANDATORY PRODUCT CATALOG PRESENTATION & PHOTO DISPATCH DIRECTIVES ===\n`;
    prompt += `1. MULTI-PRODUCT LISTING: When the customer asks for a product list, catalog, available items, collection, or what products you have (e.g. "প্রোডাক্ট লিস্ট দিন", "আপনাদের কী কী প্রোডাক্ট আছে", "show product list", "catalog", "collection", "সবগুলো দেখান", "সব প্রোডাক্ট দেখান", "ছবি পাঠান"):\n`;
    prompt += `   - You MUST list matching products from the PRODUCT CATALOG below (from 1 up to 10 products).\n`;
    prompt += `   - Format each product clearly with Name, Price, and Short description.\n`;
    prompt += `2. NEVER SEND PHOTOS ON ORDER INTENT ("নিব / অর্ডার করব"): When the customer says "নিব", "অর্ডার করব", "নিতে চাই", "কিনব", or is providing delivery details (name, phone, address), their intent is to BUY, NOT to browse. You MUST set "sendProductPhotoIds": []! Do NOT send photos during ordering.\n`;
    prompt += `3. DO NOT RE-SEND ALREADY SENT PHOTOS ("একবার পাঠালে আর পাঠাবে না"): If a product photo was already sent earlier in the conversation history, do NOT request it again in "sendProductPhotoIds". Tell the customer politely: "প্রোডাক্টের ছবিটি ইতিমধ্যে উপরে পাঠানো হয়েছে, দয়া করে একটু উপরে স্ক্রল করে দেখে নিন। আর কোনো তথ্য জানার থাকলে বলুন।"\n`;
    prompt += `4. ONLY SEND REMAINING UNSENT PHOTOS: If the customer asks for other or more pictures ("বাকিগুলো দেখান", "আরও ছবি দিন"), only provide product IDs in "sendProductPhotoIds" for items whose photos have NOT been sent yet.\n`;
    prompt += `5. RESEND ONLY ON EXPLICIT DEMAND: Only if the customer explicitly and insistently demands to re-send the picture ("আবার পাঠান", "আবার দিন", "আরেকবার পাঠান", "send again", "resend"), then and only then include that photo ID.\n`;
    prompt += `VIOLATION OF THIS PHOTO DISPATCH DIRECTIVE IS STRICTLY FORBIDDEN.\n`;

    // =========================================================================
    // MANDATORY INBOUND CUSTOMER IMAGE & HUMAN-LIKE VISION DIRECTIVE
    // =========================================================================
    prompt += `\n=== MANDATORY INBOUND CUSTOMER IMAGE & HUMAN-LIKE VISION DIRECTIVE ===\n`;
    prompt += `When the customer sends a photo/image (with or without caption):\n`;
    prompt += `1. REAL HUMAN BEHAVIOR — ACKNOWLEDGE & EXPLAIN: Always acknowledge and discuss the customer's photo politely in your conversational "replyText" like an attentive, helpful human shopkeeper. Describe what you see in the photo naturally in the customer's language. NEVER ignore the photo or act like you didn't receive it.\n`;
    prompt += `2. NEVER DUMP UNPROMPTED PHOTOS: When a customer sends a photo, they are SHOWING an item to you. You MUST set "sendProductPhotoIds": []! NEVER blast 5 product photos back unless the customer's caption explicitly demanded pictures (e.g. "আরও ছবি দিন", "অন্য কালার দেখান").\n`;
    prompt += `3. CATALOG MATCHING & AVAILABILITY:\n`;
    prompt += `   - Carefully check if the item in the photo matches any item in the PRODUCT CATALOG below.\n`;
    prompt += `   - MATCHED IN CATALOG: Confirm it is our product ("জি, এটি আমাদের কালেকশনের '[Product Name]'!"), state its exact catalog price (BDT), mention stock/size availability, and ask if they wish to order it.\n`;
    prompt += `   - NOT MATCHED IN CATALOG: Politely clarify that this exact design/model is not currently available in our stock ("ছবিটি দেখলাম। দুঃখিত, এই নির্দিষ্ট ডিজাইনের প্রোডাক্টটি বর্তমানে আমাদের স্টকে নেই।"), but mention if similar items exist in our store and offer to show available options if they want.\n`;
    prompt += `   - PAYMENT SCREENSHOT: If the image is a payment screenshot (bKash/Nagad/Rocket), acknowledge receipt politely ("পেমেন্টের স্ক্রিনশটটি পেয়েছি, ধন্যবাদ!...") without fabricating premature order confirmation.\n`;
    prompt += `4. CUSTOMER QUESTIONS ON IMAGE:\n`;
    prompt += `   - If customer asked "দাম কত?" / "কত দাম?": Quote the exact catalog price if matched; if not in catalog, explain that since it is not our item, price cannot be stated.\n`;
    prompt += `   - If customer sent the photo with NO text: Describe what you see in the photo and ask how you can help them (price, size, stock, or ordering).\n`;
    prompt += `VIOLATION OF THIS INBOUND IMAGE DIRECTIVE IS STRICTLY FORBIDDEN.\n`;

    // =========================================================================
    // MANDATORY TEMPORAL AWARENESS & STALE SCHEDULE/APPOINTMENT GUARDRAIL
    // =========================================================================
    prompt += `\n=== MANDATORY TEMPORAL AWARENESS & STALE SCHEDULE/APPOINTMENT GUARDRAIL ===\n`;
    prompt += `1. REAL-WORLD TIME ANCHOR: You MUST anchor all time-related responses to CURRENT REAL-WORLD DATE & TIME (stated in the prompt header below).\n`;
    prompt += `2. PAST RELATIVE TIMEWORDS ("আগামীকাল", "কালকে", "আজকে", "পরশু", "tomorrow", "yesterday", "next Monday", etc.):\n`;
    prompt += `   - Relative time expressions in CONVERSATION HISTORY belonged strictly to the exact day that past message was sent (check the message timestamp and relative age like "[7 days ago]"!).\n`;
    prompt += `   - NEVER assume that an event, demo session, appointment, meeting, call, or delivery discussed in a past session is happening "tomorrow" or "today" relative to right now.\n`;
    prompt += `   - If an appointment or demo was discussed hours or days ago, that scheduled time has ALREADY PASSED!\n`;
    prompt += `   - NEVER say: "আগামীকাল সকাল ১০টায় আপনার নির্ধারিত ডেমো সেশনের জন্য সব প্রস্তুতি নেওয়া হচ্ছে" or "Tomorrow is your scheduled demo session" based on old past messages!\n`;
    prompt += `3. RETURNING CUSTOMER AFTER A TIME GAP (hours, days, or weeks elapsed):\n`;
    prompt += `   - When a returning customer messages ("Hi", "Hello", "Ki obostha?", "কেমন আছেন?", "What's up?"), greet them warmly and ask how you may assist them TODAY.\n`;
    prompt += `   - DO NOT unpromptedly bring up old past appointments or claim they are scheduled for tomorrow.\n`;
    prompt += `   - If the customer asks about a demo or service, politely ask if they would like to schedule a NEW session at their convenient time ("আপনি কি নতুন কোনো সময়ে ডেমো বা মিটিং শিডিউল করতে চান?").\n`;
    prompt += `4. GENERAL CASUAL INQUIRIES ("Ki obostha?", "কেমন আছেন?", "how are you?"): Answer politely ("আলহামদুলিল্লাহ, আমি ভালো আছি! আপনি কেমন আছেন? আজ আপনাকে কীভাবে সাহায্য করতে পারি?"), WITHOUT falsely asserting stale past appointments.\n`;
    prompt += `5. SCHEDULING NEW SESSIONS: An appointment or demo is ONLY scheduled for tomorrow if the customer EXPLICITLY books and confirms a date/time in the CURRENT active turn.\n`;
    prompt += `VIOLATION OF THIS TEMPORAL GUARDRAIL IS STRICTLY FORBIDDEN.\n`;

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
    } else if (options?.isOrderPlacementActive) {
      const cfg = options.orderPlacementConfig || {};
      const policy = cfg.paymentPolicy || 'cod';
      const insideDhaka = Number(cfg.deliveryChargeInsideDhaka ?? 60);
      const outsideDhaka = Number(cfg.deliveryChargeOutsideDhaka ?? 120);
      const mfsList = (cfg.mfsAccounts || [])
        .filter((a: any) => a.accountNumber && a.accountNumber.trim())
        .map((a: any) => `${a.provider} (${a.accountType}): ${a.accountNumber}`)
        .join(', ');

      prompt += `2. ORDER PLACEMENT & PAYMENT POLICY DIRECTIVE:\n`;
      prompt += `   - MANDATORY CUSTOMER DETAILS FOR PHYSICAL PRODUCT ORDERS:\n`;
      prompt += `     To complete an order, the following 4 customer details are strictly required:\n`;
      prompt += `     ১. কাস্টমারের পুরো নাম (Customer Full Name)\n\n`;
      prompt += `     ২. ১১ ডিজিটের মোবাইল নম্বর (11-digit Valid Mobile Phone)\n\n`;
      prompt += `     ৩. বিস্তারিত ডেলিভারি ঠিকানা (Detailed Delivery Address)\n\n`;
      prompt += `     ৪. ডেলিভারি এলাকা (ঢাকার ভেতরে নাকি ঢাকার বাইরে)\n\n`;
      prompt += `     If any of these 4 details are missing from the message or CUSTOMER INFO, politely ask the customer ONLY for the missing details before proposing or confirming the order.\n`;
      prompt += `     MANDATORY FORMAT: Whenever asking for missing details or listing points, format each detail as a numbered point (১., ২., ৩., ৪.) and ALWAYS leave an empty line (\\n\\n) between every point so they are clean, spacious, and easily readable on mobile ("ফাঁকা ফাঁকা পয়েন্ট আকারে").\n`;
      prompt += `     When the customer provides name, phone, address, or location, also extract them into "customerDetails" in the JSON response.\n`;
      prompt += `   - DYNAMIC DELIVERY CHARGES:\n`;
      prompt += `     Inside Dhaka: BDT ${insideDhaka} | Outside Dhaka: BDT ${outsideDhaka}\n`;
      prompt += `   - STORE PAYMENT POLICY: ${policy.toUpperCase()}\n`;
      if (policy === 'cod') {
        prompt += `     Cash on Delivery (COD): 100% of bill (Products + Delivery) is paid in cash upon delivery. When details are complete, summarize order and ask customer to reply 'CONFIRM'.\n`;
      } else if (policy === 'delivery_advance') {
        prompt += `     Delivery Charge Advance: Delivery charge (BDT ${insideDhaka} inside Dhaka / BDT ${outsideDhaka} outside Dhaka) must be paid in advance via bKash/Nagad. Product price is COD.\n`;
        prompt += `     Explain this policy clearly to customer. ${mfsList ? `Payment accounts: ${mfsList}.` : ''} ${cfg.paymentInstructionNote || ''} Instruct customer to send a screenshot or TrxID after paying.\n`;
      } else if (policy === 'full_advance') {
        prompt += `     Full Advance Payment: Entire total bill (Products + Delivery charge) must be paid in advance via bKash/Nagad before order is confirmed.\n`;
        prompt += `     Explain this policy clearly to customer. ${mfsList ? `Payment accounts: ${mfsList}.` : ''} ${cfg.paymentInstructionNote || ''} Instruct customer to send a screenshot or TrxID after paying.\n`;
      }
      prompt += `   - PAYMENT SCREENSHOT & CONFIRMATION PROTOCOL:\n`;
      prompt += `     CRITICAL: DO NOT claim or hallucinate that you have verified a payment screenshot or that an order is confirmed on your own in replyText! Automated background verification handles screenshot validation and order creation in the database. Never say "পেমেন্ট সফলভাবে যাচাই করা হয়েছে" or "অর্ডারটি কনফার্ম করা হয়েছে" unless an order number has already been provided in the chat.\n`;
    } else {
      prompt += `2. ORDER PLACEMENT IS DISABLED: Set "intent": "general" or "product_lookup" and do NOT generate order proposals.\n`;
    }

    prompt += `\n--- MANDATORY STRUCTURED JSON RESPONSE OUTPUT FORMAT ---\n`;
    prompt += `You MUST output a single valid JSON object with NO preamble. The JSON schema must strictly follow:\n`;
    prompt += `{\n`;
    prompt += `  "replyText": "your friendly response to customer in the EXACT SAME language they used (German if German, English if English, Bengali if Bengali, etc.)",\n`;
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
      prompt += `  "customerDetails": { "name": "Customer Name", "phone": "017XXXXXXXX", "address": "Detailed Address", "deliveryArea": "inside_dhaka | outside_dhaka" },\n`;
    }
    prompt += `  "imageProductDescription": "short description of product seen in image",\n`;
    prompt += `  "sendProductPhotoIds": ["id1", "id2"],\n`;
    prompt += `  "supportSignal": false,\n`;
    prompt += `  "supportReason": "general | complaint | refund_return | delivery_issue",\n`;
    prompt += `  "matchedTags": ["tag name 1", "tag name 2"]\n`;
    prompt += `}\n`;

    // =========================================================================
    // SECTION 2: DYNAMIC FOOTER (DYNAMIC RETRIEVED DATA + CUSTOMER CONTEXT)
    // =========================================================================
    if (options?.isImage) {
      prompt += `\n--- INBOUND CUSTOMER IMAGE ANALYSIS & CONVERSATION INSTRUCTIONS ---\n`;
      prompt += `The customer sent an image (attached). You MUST behave like a warm, attentive human shopkeeper:\n`;
      prompt += `1. ACKNOWLEDGE & DISCUSS IN REPLYTEXT: In your conversational "replyText", directly acknowledge and discuss the customer's photo (e.g. "আপনার পাঠানো ছবিটি দেখলাম, এটি একটি [পণ্য/পোশাকের বিবরণ/রং]..." or "Thank you for the picture! I see this is a [description]..."). NEVER ignore the image!\n`;
      prompt += `2. CATALOG COMPARISON & AVAILABILITY:\n`;
      prompt += `   - Carefully check if the item in the image matches any item in the PRODUCT CATALOG below.\n`;
      prompt += `   - IF MATCHED (Our product): State clearly that it is from our collection: "জি, এটি আমাদের কালেকশনের '[Product Name]'! এর মূল্য ৳[Price]।" State availability/sizes/colors and ask if they would like to place an order or know anything else.\n`;
      prompt += `   - IF NOT MATCHED (External / Not in catalog): Politely explain: "ছবিটি দেখলাম। দুঃখিত, এই নির্দিষ্ট ডিজাইনের প্রোডাক্টটি বর্তমানে আমাদের স্টকে নেই।" Mention if we have similar category products in our store, and offer to share our available collection.\n`;
      prompt += `   - IF PAYMENT RECEIPT (bKash/Nagad screenshot): Politely acknowledge: "পেমেন্টের স্ক্রিনশটটি পেয়েছি, ধন্যবাদ! আমাদের টিম/সিস্টেম এটি যাচাই করছে..."\n`;
      prompt += `3. CUSTOMER INQUIRY ON IMAGE:\n`;
      prompt += `   - If customer asked "দাম কত?" / "কত দাম?" / "দাম": Quote the exact catalog price if matched; if not in catalog, explain that since it is not our item, price cannot be stated.\n`;
      prompt += `   - If customer sent the image with NO text/caption: Describe what is in the photo and ask how you may assist them (price, size, stock, or ordering).\n`;
      prompt += `4. STRICT NO-PHOTO-BLAST RULE: You MUST set "sendProductPhotoIds": []! DO NOT request or send product photos when the customer sends an image, unless the customer's caption explicitly demanded more photos.\n`;
      if (options.caption) {
        prompt += `Customer Caption: "${options.caption}"\n`;
      } else {
        prompt += `Customer Caption: (None provided — customer sent image alone. Describe what you see and politely ask what they need regarding this item).\n`;
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
      prompt += `\n--- DYNAMICALLY INDEXED BUSINESS Q&A (MATCHED SOURCE OF TRUTH) ---\n`;
      qnaItems.forEach(q => {
        if (q.answer && q.answer.trim()) {
          prompt += `Q: ${q.question}\nA: ${q.answer}\n`;
        }
      });
    }

    let websiteSummaryText = '';
    if (conversation.tenant?.websiteSummary) {
      const ws: any = conversation.tenant.websiteSummary;
      if (typeof ws === 'string') {
        try {
          const parsed = JSON.parse(ws);
          websiteSummaryText = parsed.summary || parsed.text || ws;
        } catch {
          websiteSummaryText = ws;
        }
      } else if (typeof ws === 'object' && ws !== null) {
        websiteSummaryText = ws.summary || ws.text || JSON.stringify(ws);
      }
    }

    if (websiteSummaryText && websiteSummaryText.trim()) {
      prompt += `\n--- VERIFIED WEBSITE KNOWLEDGE SUMMARY (${conversation.tenant.websiteUrl || ''}) ---\n`;
      prompt += `${websiteSummaryText.trim()}\n`;
    }

    if (retrievedChunks.length > 0) {
      prompt += `\n--- DYNAMICALLY INDEXED KNOWLEDGE DOCS (VECTOR RAG MATCHES) ---\n`;
      retrievedChunks.forEach((c: any) => {
        prompt += `Content: ${c.content}\n`;
      });
    }

    // ── Catalog / Listings context (branched by mode) ──────────────────────
    if (options?.isPropertyMode) {
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
          const propertyStatus = attrs.propertyStatus || attrs.status || 'available';
          const floor = attrs.floor || attrs.floorNo || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request (negotiable)' : `BDT ${p.price.toString()}`;
          prompt += `- ${listingType} ${p.name}`;
          if (location) prompt += ` | 📍 ${location}`;
          if (area) prompt += ` | 📐 ${area} sqft`;
          if (bedrooms) prompt += ` | 🛏 ${bedrooms} BR`;
          if (bathrooms) prompt += ` | 🚿 ${bathrooms} Bath`;
          if (floor) prompt += ` | 🏢 Floor: ${floor}`;
          prompt += ` | 🔖 Status: ${propertyStatus} | 💰 ${priceStr}`;
          const propExclude = ['area', 'Area (sqft)', 'bedrooms', 'Bedrooms', 'bathrooms', 'Bathrooms', 'propertyStatus', 'status', 'floor', 'floorNo', 'facing', 'furnished', 'listingType', 'location'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!propExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isHospitalityMode) {
      if (products.length > 0) {
        prompt += `\n--- HOTEL ROOMS & SUITES (Source of Truth for Available Rooms) ---\n`;
        prompt += `IMPORTANT: You are a HOTEL & HOSPITALITY reservation assistant. Do NOT create product orders. Help guests check room options, amenities, rates, and collect booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const roomType = attrs.roomType ? `[${String(attrs.roomType).toUpperCase()}]` : '';
          const capacity = attrs.capacity || attrs.maxGuests || attrs.guests || '';
          const bedType = attrs.bedType || '';
          const view = attrs.view || attrs.roomView || '';
          const amenities = Array.isArray(attrs.amenities) ? attrs.amenities.join(', ') : (attrs.amenities || '');
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Rate on Request' : `BDT ${p.price.toString()}/night`;
          prompt += `- ${roomType} ${p.name}`;
          if (capacity) prompt += ` | 👥 Max ${capacity} Guests`;
          if (bedType) prompt += ` | 🛏 ${bedType}`;
          if (view) prompt += ` | 🌅 View: ${view}`;
          if (amenities) prompt += ` | ✨ Amenities: ${amenities}`;
          prompt += ` | 💰 ${priceStr}`;
          const hospExclude = ['roomType', 'capacity', 'maxGuests', 'guests', 'bedType', 'view', 'roomView', 'amenities'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!hospExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isTechSoftwareMode) {
      if (products.length > 0) {
        prompt += `\n--- SOFTWARE & TECH PACKAGES (Source of Truth for Available Plans) ---\n`;
        prompt += `IMPORTANT: You are a SOFTWARE & SAAS CONSULTANT. Do NOT create physical product orders. Help customers understand pricing tiers (Starter, Pro, Enterprise), key features, live demo links, and collect demo requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const tier = attrs.tier ? `[${String(attrs.tier).toUpperCase()}]` : '';
          const features = Array.isArray(attrs.features) ? attrs.features.join(', ') : (attrs.features || '');
          const demoUrl = attrs.demoUrl || attrs.demoLink || '';
          const maxUsers = attrs.maxUsers || attrs.userLimit || '';
          const sla = attrs.sla || attrs.uptime || '';
          const licenseType = attrs.licenseType || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request (contact for quote)' : `BDT ${p.price.toString()}/mo`;
          prompt += `- ${tier} ${p.name}`;
          if (features) prompt += ` | ⚡ Features: ${features}`;
          if (maxUsers) prompt += ` | 👥 Max Users: ${maxUsers}`;
          if (sla) prompt += ` | ⏱ SLA/Uptime: ${sla}`;
          if (licenseType) prompt += ` | 📄 License: ${licenseType}`;
          if (demoUrl) prompt += ` | 🔗 Demo: ${demoUrl}`;
          prompt += ` | 💰 ${priceStr}`;
          const techExclude = ['tier', 'features', 'demoUrl', 'demoLink', 'maxUsers', 'userLimit', 'sla', 'uptime', 'licenseType'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!techExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isFinancialServiceMode) {
      if (products.length > 0) {
        prompt += `\n--- SERVICE PACKAGES & CONSULTANCY (Source of Truth for Services) ---\n`;
        prompt += `IMPORTANT: You are a FINANCIAL & PROFESSIONAL SERVICES CONSULTANT. Do NOT create physical product orders. Help clients check consultation packages, fees, scope of work, required documents, and collect consultation booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const scope = attrs.scope || attrs.description || '';
          const docs = Array.isArray(attrs.requiredDocs) ? attrs.requiredDocs.join(', ') : (attrs.requiredDocs || '');
          const duration = attrs.duration || attrs.engagementDuration || '';
          const consultant = attrs.consultant || attrs.leadConsultant || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price.toString()}`;
          prompt += `- ${p.name}`;
          if (scope) prompt += ` | 💼 Scope: ${scope}`;
          if (duration) prompt += ` | ⏳ Duration: ${duration}`;
          if (consultant) prompt += ` | 👤 Consultant: ${consultant}`;
          if (docs) prompt += ` | 📋 Required Documents: ${docs}`;
          prompt += ` | 💰 Consultation Fee: ${priceStr}`;
          const finExclude = ['scope', 'description', 'requiredDocs', 'duration', 'engagementDuration', 'consultant', 'leadConsultant'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!finExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isHealthcareMode) {
      if (products.length > 0) {
        prompt += `\n--- DOCTORS, CLINIC SERVICES & APPOINTMENTS (Source of Truth for Medical Care) ---\n`;
        prompt += `IMPORTANT: You are a MEDICAL & CLINIC RECEPTION ASSISTANT. Do NOT create physical product orders. Help patients check doctor availability, specializations, visiting hours, consultation fees, and collect appointment booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const spec = attrs.specialization || attrs.specialty || '';
          const hours = attrs.visitingHours || attrs.schedule || '';
          const clinicRoom = attrs.clinicRoom || attrs.chamberRoom || attrs.room || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price.toString()}`;
          prompt += `- Dr. ${p.name}`;
          if (spec) prompt += ` | 🩺 Specialty: ${spec}`;
          if (hours) prompt += ` | 🕒 Visiting Hours: ${hours}`;
          if (clinicRoom) prompt += ` | 🏥 Chamber/Room: ${clinicRoom}`;
          prompt += ` | 💰 Consultation Fee: ${priceStr}`;
          const healthExclude = ['specialization', 'specialty', 'visitingHours', 'schedule', 'clinicRoom', 'chamberRoom', 'room'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!healthExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isEducationMode) {
      if (products.length > 0) {
        prompt += `\n--- COURSES & ACADEMIC PROGRAMS (Source of Truth for Education & Academies) ---\n`;
        prompt += `IMPORTANT: You are an ACADEMIC COUNSELOR & ADMISSIONS ASSISTANT. Do NOT create physical product orders. Help students check course details, batch schedules, fees, syllabus overview, and collect course admission inquiry requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const duration = attrs.duration || attrs.courseDuration || '';
          const schedule = attrs.classSchedule || attrs.batchSchedule || '';
          const syllabus = attrs.syllabusUrl || attrs.syllabusLink || '';
          const instructor = attrs.instructor || attrs.teacher || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price.toString()}`;
          prompt += `- ${p.name}`;
          if (duration) prompt += ` | ⏳ Duration: ${duration}`;
          if (schedule) prompt += ` | 📅 Batch Schedule: ${schedule}`;
          if (instructor) prompt += ` | 👨‍🏫 Instructor: ${instructor}`;
          if (syllabus) prompt += ` | 📚 Syllabus: ${syllabus}`;
          prompt += ` | 💰 Course Fee: ${priceStr}`;
          const eduExclude = ['duration', 'courseDuration', 'classSchedule', 'batchSchedule', 'syllabusUrl', 'syllabusLink', 'instructor', 'teacher'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!eduExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isManufacturingMode) {
      if (products.length > 0) {
        prompt += `\n--- B2B WHOLESALE & FACTORY PRODUCTS (Source of Truth for Manufacturing & Industrial) ---\n`;
        prompt += `IMPORTANT: You are a B2B FACTORY & WHOLESALE SALES ASSISTANT. Do NOT create physical retail orders. Help wholesale buyers check unit prices, Minimum Order Quantity (MOQ), product specifications, and collect bulk RFQ quotation requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const moq = attrs.moq || attrs.minimumOrderQty || attrs.minimumOrderQuantity || '';
          const material = attrs.material || attrs.grade || '';
          const spec = attrs.specifications || attrs.specSheet || '';
          const leadTime = attrs.leadTime || attrs.productionTime || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request (RFQ)' : `BDT ${p.price.toString()}/unit`;
          prompt += `- ${p.name}`;
          if (moq) prompt += ` | 📦 MOQ: ${moq}`;
          if (material) prompt += ` | 🧵 Material/Grade: ${material}`;
          if (leadTime) prompt += ` | ⏱ Lead Time: ${leadTime}`;
          if (spec) prompt += ` | 🏭 Specs: ${spec}`;
          prompt += ` | 💰 Wholesale Unit Price: ${priceStr}`;
          const mfgExclude = ['moq', 'minimumOrderQty', 'minimumOrderQuantity', 'material', 'grade', 'specifications', 'specSheet', 'leadTime', 'productionTime'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!mfgExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else if (options?.isLogisticsMode) {
      if (products.length > 0) {
        prompt += `\n--- LOGISTICS, FREIGHT & SHIPMENT SERVICES (Source of Truth for Logistics & Infrastructure) ---\n`;
        prompt += `IMPORTANT: You are a LOGISTICS, FREIGHT & DISPATCH ASSISTANT. Do NOT create physical retail orders. Help shippers check cargo routes, vehicle/fleet capacity (Tons/CBM), freight rates, tracking info, and collect shipment booking requests.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const route = attrs.route || attrs.originDestination || '';
          const vehicleType = attrs.vehicleType || '';
          const capacity = attrs.capacity || attrs.weightLimit || '';
          const transitTime = attrs.transitTime || attrs.deliveryTime || '';
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Rate on Request' : `BDT ${p.price.toString()}`;
          prompt += `- ${p.name}`;
          if (route) prompt += ` | 🛣 Route: ${route}`;
          if (vehicleType) prompt += ` | 🚛 Vehicle: ${vehicleType}`;
          if (capacity) prompt += ` | ⚖ Capacity: ${capacity}`;
          if (transitTime) prompt += ` | ⏱ Transit Time: ${transitTime}`;
          prompt += ` | 💰 Freight Rate: ${priceStr}`;
          const logExclude = ['route', 'originDestination', 'vehicleType', 'capacity', 'weightLimit', 'transitTime', 'deliveryTime'];
          Object.entries(attrs).forEach(([k, v]) => {
            if (!logExclude.includes(k) && v !== undefined && v !== null && v !== '') {
              prompt += ` | ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`;
            }
          });
          prompt += `\n`;
        });
      }
    } else {
      // Default: Retail / E-commerce OR unrecognized vertical
      // Inject ALL product fields including every custom attribute so AI misses nothing
      if (products.length > 0) {
        prompt += `\n--- PRODUCT CATALOG (Source of Truth for Available Items) ---\n`;
        prompt += `IMPORTANT: Read ALL product attributes carefully. Answer customer questions about any product field precisely.\n`;
        products.forEach(p => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request' : `BDT ${p.price.toString()}`;
          const photoBadge = p.imageUrl ? ' | 📸 [Photo Available]' : '';
          prompt += `- [ID: ${p.id}] ${p.name} | 💰 ${priceStr}${photoBadge}`;
          if (p.sku) prompt += ` | SKU: ${p.sku}`;
          if (p.description) prompt += ` | 📝 ${p.description}`;
          if (p.trackInventory) prompt += ` | 📦 Stock: ${p.stockCount ?? 0}`;
          // Inject every custom attribute key-value — zero fields missed
          const attrEntries = Object.entries(attrs).filter(([, v]) => v !== undefined && v !== null && v !== '');
          attrEntries.forEach(([k, v]) => {
            const display = Array.isArray(v) ? v.join(', ') : String(v);
            prompt += ` | ${k}: ${display}`;
          });
          prompt += `\n`;
        });
      }
    }

    const now = new Date();
    const currentDateTimeStr = now.toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    prompt += `\n=== CURRENT REAL-WORLD DATE & TIME ===\n`;
    prompt += `Current Timestamp: ${currentDateTimeStr} (Asia/Dhaka, GMT+6)\n`;

    prompt += `\n--- CONVERSATION HISTORY ---\n`;
    const sortedHistory = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let prevMsgTime: Date | null = null;

    sortedHistory.forEach(msg => {
      const msgDate = new Date(msg.createdAt);
      if (prevMsgTime) {
        const gapMs = msgDate.getTime() - prevMsgTime.getTime();
        const gapHours = Math.floor(gapMs / (1000 * 60 * 60));
        const gapDays = Math.floor(gapHours / 24);
        if (gapDays >= 1) {
          prompt += `\n[--- TIME GAP: ${gapDays} DAY${gapDays > 1 ? 'S' : ''} (${gapHours} HOURS) ELAPSED BETWEEN CONVERSATIONS ---]\n\n`;
        } else if (gapHours >= 6) {
          prompt += `\n[--- TIME GAP: ${gapHours} HOURS ELAPSED ---]\n\n`;
        }
      }
      prevMsgTime = msgDate;

      // Calculate relative age from now
      const ageMs = now.getTime() - msgDate.getTime();
      const ageMin = Math.floor(ageMs / 60000);
      const ageHours = Math.floor(ageMin / 60);
      const ageDays = Math.floor(ageHours / 24);
      let relativeAge = 'just now';
      if (ageMin >= 2 && ageMin < 60) relativeAge = `${ageMin}m ago`;
      else if (ageHours >= 1 && ageHours < 24) relativeAge = `${ageHours}h ago`;
      else if (ageDays === 1) relativeAge = `yesterday`;
      else if (ageDays > 1) relativeAge = `${ageDays} days ago`;

      const msgTimeFormatted = msgDate.toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const sender = msg.direction === 'inbound' ? 'Customer' : 'Assistant';
      let text = '';
      if (typeof msg.content === 'object' && msg.content !== null) {
        const cnt = msg.content as any;
        text = cnt.body || cnt.text || cnt.caption || '';
        if (cnt.quotedMsg?.text) {
          text = `[Quoting: "${cnt.quotedMsg.text}"] ${text}`;
        }
      } else if (typeof msg.content === 'string') {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed && typeof parsed === 'object') {
            text = parsed.body || parsed.text || parsed.caption || msg.content;
            if (parsed.quotedMsg?.text) {
              text = `[Quoting: "${parsed.quotedMsg.text}"] ${text}`;
            }
          } else {
            text = msg.content;
          }
        } catch {
          text = msg.content;
        }
      }
      if (text) {
        prompt += `[${msgTimeFormatted} | ${relativeAge}] ${sender}: ${text}\n`;
      }
    });

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
      // 0. Mark conversation as order/lead request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/booking request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/demo request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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

      // 6. Create Order record for /dashboard/orders (Demo Requests)
      const proposalItems: any[] = [];
      if (interestedSoftwareName) {
        const matchedProduct = await this.prisma.product.findFirst({
          where: {
            tenantId,
            isActive: true,
            OR: [
              { name: { contains: interestedSoftwareName, mode: 'insensitive' } },
              { description: { contains: interestedSoftwareName, mode: 'insensitive' } }
            ]
          }
        });
        if (matchedProduct) {
          proposalItems.push({
            productId: matchedProduct.id,
            quantity: 1,
            priceAtTime: Number(matchedProduct.price)
          });
        }
      }

      await this.ordersService.createOrder(tenantId, {
        contactId,
        conversationId,
        items: proposalItems,
        notes: `[AI Demo Request] ${interestedSoftwareName ? 'Software/Plan: ' + interestedSoftwareName + ' | ' : ''}Customer message: "${userText.slice(0, 300)}"`,
        createdBy: 'ai'
      }).catch((e: any) => this.logger.error(`Failed to create order for demo request: ${e.message}`));

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
      // 0. Mark conversation as order/consultation request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/appointment request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/course inquiry
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/RFQ request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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
      // 0. Mark conversation as order/shipment request
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { hasOrderRequest: true }
      });

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

  private formatSpaciousResponse(text: string): string {
    if (!text) return '';
    let cleaned = String(text).trim();

    // If text is JSON or contains JSON, extract reply text safely
    if (cleaned.startsWith('{') || cleaned.startsWith('```') || /"(?:reply_?text|response|reply|message|text)"\s*:/i.test(cleaned)) {
      try {
        const parsed = this.safeParseLlmJson(cleaned);
        if (parsed && typeof parsed === 'object') {
          const extracted = parsed.replyText ?? parsed.replytext ?? parsed.reply_text ?? parsed.response ?? parsed.reply ?? parsed.message ?? parsed.text;
          if (typeof extracted === 'string') {
            cleaned = extracted;
          }
        }
      } catch {
        const replyMatch = cleaned.match(/"(?:reply_?text|response|reply|message|text)"\s*:\s*"((?:[^"\\]|\\.)*)"/si);
        if (replyMatch) {
          cleaned = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
      }
    }

    if (typeof cleaned === 'string') {
      cleaned = cleaned.replace(/\\n/g, '\n');
      cleaned = cleaned.replace(/([^\n])\n([১-৯1-9]\.|\([a-zA-Z0-9]\)|[a-zA-Z]\)|•)\s*/g, '$1\n\n$2 ');
      cleaned = cleaned.replace(/([১-৯1-9]\.[^\n]+|[•][^\n]+)\n([^\n\s1-9১-৯•\-*])/g, '$1\n\n$2');
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    }
    return typeof cleaned === 'string' ? cleaned.trim() : '';
  }

  /**
   * Recovers product items and delivery details from recent conversation messages
   * when pendingOrderProposal was lost, omitted, or expired.
   */
  async recoverProductAndProposalFromHistory(
    tenantId: string,
    conversationId: string
  ): Promise<{ items: any[]; deliveryArea: string; deliveryCharge: number; subtotal: number } | null> {
    try {
      const recentMessages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { content: true, senderType: true }
      });

      const activeProducts = await this.prisma.product.findMany({
        where: { tenantId, isActive: true }
      });

      if (!activeProducts || activeProducts.length === 0) return null;

      let matchedProduct: any = null;
      let deliveryArea = 'inside_dhaka';

      for (const m of recentMessages) {
        const content = m.content as any;
        if (!content) continue;

        // 1. Quoted Message product ID or text
        if (content.quotedMsg?.productId) {
          const prod = activeProducts.find(p => p.id === content.quotedMsg.productId);
          if (prod) {
            matchedProduct = prod;
            break;
          }
        }
        if (content.productId) {
          const prod = activeProducts.find(p => p.id === content.productId);
          if (prod) {
            matchedProduct = prod;
            break;
          }
        }

        // 2. Check text or body
        const textToCheck = typeof content === 'string'
          ? content
          : (content.text || content.body || '');
        const textLower = textToCheck.toLowerCase();

        if (
          textLower.includes('ঢাকার বাইরে') ||
          textLower.includes('outside dhaka') ||
          ['নোয়াখালী', 'চট্টগ্রাম', 'সিলেট', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ', 'কুমিল্লা', 'বগুড়া'].some(kw => textLower.includes(kw))
        ) {
          deliveryArea = 'outside_dhaka';
        }

        if (!matchedProduct) {
          // Check for "📦 1x {name} (৳{price})"
          const matchPkg = textToCheck.match(/📦\s*\d*x?\s*([^(]+)\s*\(/);
          if (matchPkg) {
            const candidateName = matchPkg[1].trim().toLowerCase();
            const prod = activeProducts.find(p => p.name.trim().toLowerCase().includes(candidateName) || candidateName.includes(p.name.trim().toLowerCase()));
            if (prod) {
              matchedProduct = prod;
              break;
            }
          }

          // Check product names
          for (const prod of activeProducts) {
            const pNameLower = prod.name.trim().toLowerCase();
            if (pNameLower.length >= 2 && textLower.includes(pNameLower)) {
              matchedProduct = prod;
              break;
            }
            if (prod.sku && prod.sku.length >= 2 && textLower.includes(prod.sku.toLowerCase())) {
              matchedProduct = prod;
              break;
            }
          }
        }
      }

      // If no match in text, fallback to the first active product of the tenant
      const productToUse = matchedProduct || activeProducts[0];
      const price = Number(productToUse.price);
      const deliveryCharge = deliveryArea === 'outside_dhaka' ? 120 : 60;

      return {
        items: [{
          productId: productToUse.id,
          name: productToUse.name,
          price,
          quantity: 1
        }],
        subtotal: price,
        deliveryArea,
        deliveryCharge
      };
    } catch (err: any) {
      this.logger.warn(`recoverProductAndProposalFromHistory failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Universal Order Confirmation Safety Net (Zero False Confirmation Guarantee).
   * Ensures that no AI message asserts order confirmation unless a corresponding
   * Order record actually exists in the database.
   */
  async enforceOrderConfirmationIntegrity(
    tenantId: string,
    conversation: any,
    conversationId: string,
    replyText: string,
    assistantId?: string
  ): Promise<string> {
    if (!replyText) return replyText;

    const confirmationPhrases = [
      'অর্ডারটি কনফার্ম', 'অর্ডার কনফার্ম', 'অর্ডার নিশ্চিত',
      'order confirmed', 'order has been confirmed', 'order has been placed',
      'অর্ডার প্লেস করা হয়েছে', 'অর্ডার তৈরি করা হয়েছে', 'অর্ডার কনফার্ম করে দিচ্ছি'
    ];
    const replyLower = replyText.toLowerCase();
    const claimsConfirmation = confirmationPhrases.some(phrase => replyLower.includes(phrase));

    if (!claimsConfirmation) {
      return replyText;
    }

    // Check if an order already exists for this conversation in the last 24 hours
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        tenantId,
        conversationId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingOrder) {
      const orderNum = existingOrder.id.slice(0, 8);
      if (!replyText.includes(orderNum)) {
        return `${replyText}\n\n(অর্ডার নম্বর: #${orderNum})`;
      }
      return replyText;
    }

    // NO order exists in the DB! Create the order now to enforce integrity.
    this.logger.warn(`AI message claims order is confirmed for conversation ${conversationId}, but no Order record exists! Executing emergency order creation.`);

    let proposal = conversation?.pendingOrderProposal as any;
    let itemsToOrder: any[] = [];
    let deliveryArea = 'inside_dhaka';
    let deliveryCharge = 60;
    let notes = 'Source: AI Confirmation Emergency Creator';

    if (proposal?.items?.length) {
      itemsToOrder = proposal.items;
      deliveryArea = proposal.deliveryArea || 'outside_dhaka';
      deliveryCharge = Number(proposal.deliveryCharge || (deliveryArea === 'outside_dhaka' ? 120 : 60));
    } else {
      const recovered = await this.recoverProductAndProposalFromHistory(tenantId, conversationId);
      if (recovered?.items?.length) {
        itemsToOrder = recovered.items;
        deliveryArea = recovered.deliveryArea || 'outside_dhaka';
        deliveryCharge = recovered.deliveryCharge || (deliveryArea === 'outside_dhaka' ? 120 : 60);
      }
    }

    const contactId = conversation?.contactId;
    const contact = contactId
      ? await this.prisma.contact.findUnique({ where: { id: contactId } }).catch(() => null)
      : null;

    if (itemsToOrder.length > 0 && contact) {
      const validatedItems: { productId: string; quantity: number; priceAtTime: number }[] = [];
      let grandTotal = 0;

      for (const item of itemsToOrder) {
        const liveProduct = await this.prisma.product.findFirst({
          where: { id: item.productId, tenantId, isActive: true }
        });
        if (liveProduct) {
          const price = Number(liveProduct.price);
          const qty = item.quantity || 1;
          validatedItems.push({
            productId: liveProduct.id,
            quantity: qty,
            priceAtTime: price
          });
          grandTotal += price * qty;
        }
      }

      if (validatedItems.length > 0) {
        const totalWithDelivery = grandTotal + deliveryCharge;
        const createdOrder = await this.ordersService.createOrder(tenantId, {
          contactId: contact.id,
          conversationId,
          items: validatedItems,
          notes: `Policy: Confirmed by AI | Total: ৳${totalWithDelivery} | Delivery Charge: ৳${deliveryCharge} | Area: ${deliveryArea} | ${notes}`
        });

        await (this.prisma as any).order.update({
          where: { id: createdOrder.id },
          data: { createdBy: 'ai', status: 'confirmed' }
        });

        await (this.prisma as any).conversation.update({
          where: { id: conversationId },
          data: { pendingOrderProposal: null, hasOrderRequest: true }
        });

        await this.activityLogService.record({
          tenantId,
          conversationId,
          contactId: contact.id,
          type: 'ORDER_CREATED',
          metadataJson: {
            orderId: createdOrder.id,
            source: 'universal_confirmation_guardrail',
            totalAmount: totalWithDelivery
          }
        });

        const orderNum = createdOrder.id.slice(0, 8);
        return replyText.includes(orderNum)
          ? replyText
          : `${replyText}\n\n(অর্ডার নম্বর: #${orderNum})`;
      }
    }

    // Fallback: If any active product exists in tenant catalog, create fallback order
    const anyProduct = await this.prisma.product.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (anyProduct && contact) {
      const createdOrder = await this.ordersService.createOrder(tenantId, {
        contactId: contact.id,
        conversationId,
        items: [{
          productId: anyProduct.id,
          quantity: 1,
          priceAtTime: Number(anyProduct.price)
        }],
        notes: `Policy: AI Auto-Created Fallback Order | Customer: ${contact.name || ''} (${contact.phone || ''}) | Address: ${contact.address || ''}`
      });

      await (this.prisma as any).order.update({
        where: { id: createdOrder.id },
        data: { createdBy: 'ai', status: 'pending' }
      });

      await (this.prisma as any).conversation.update({
        where: { id: conversationId },
        data: { pendingOrderProposal: null, hasOrderRequest: true }
      });

      const orderNum = createdOrder.id.slice(0, 8);
      return `${replyText}\n\n(অর্ডার নম্বর: #${orderNum})`;
    }

    // Absolute fallback: If no products exist in catalog at all, acknowledge without false confirmation
    return `আপনার তথ্য পেয়েছি। আমাদের টিম এটি ভেরিফাই করে বিস্তারিত জানাচ্ছে। সাথে থাকার জন্য ধন্যবাদ!`;
  }
}
