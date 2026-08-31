import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';

import { QuotaService } from '../tenants/quota.service';
import { CryptoService } from '../crypto/crypto.service';
import { FileValidationService } from '../file-validation/file-validation.service';
import { ToolConfigValidatorService } from './services/tool-config-validator.service';
import { AiCacheService } from '../ai/ai-cache.service';
import { AiService } from '../ai/ai.service';

import { Logger } from '@nestjs/common';

import { WebsiteCrawlerService } from './website-crawler.service';

@Injectable()
export class AiTrainingService {
  private readonly logger = new Logger(AiTrainingService.name);

  constructor(
    private prisma: PrismaService,
    private quotaService: QuotaService,
    private cryptoService: CryptoService,
    private fileValidationService: FileValidationService,
    private toolConfigValidator: ToolConfigValidatorService,
    private aiCacheService: AiCacheService,
    private aiService: AiService,
    private websiteCrawlerService: WebsiteCrawlerService
  ) {}

  private async ensureAiAssistantExists(tenantId: string) {
    let assistant = await this.prisma.aiAssistant.findFirst({
      where: { tenantId }
    });

    if (!assistant) {
      assistant = await this.prisma.aiAssistant.create({
        data: {
          tenantId,
          modelProvider: 'openai',
          modelName: 'gpt-4o-mini',
          apiKeyMode: 'platform', // Deprecated but required by schema
          routingMode: 'system_only'
        }
      });
    }

    await this.ensureDefaultTools(assistant.id, assistant.aiOrderEnabled);
    return assistant;
  }

  async ensureDefaultTools(assistantId: string, assistantAiOrderEnabled: boolean = true) {
    const existingTools = await this.prisma.aiAssistantTool.findMany({
      where: { assistantId }
    });

    const existingTypes = new Set(existingTools.map(t => t.toolType));

    const defaultTools = [
      {
        toolType: 'order_placement',
        isEnabled: assistantAiOrderEnabled,
        configJson: { requireExplicitConfirmation: true }
      },
      {
        toolType: 'image_reading',
        isEnabled: true,
        configJson: {}
      },
      {
        toolType: 'support_detection',
        isEnabled: false,
        configJson: { reasonCategories: ['general', 'complaint', 'refund_return', 'delivery_issue'] }
      },
      {
        toolType: 'product_matching',
        isEnabled: false,
        configJson: { minMatchConfidence: 0.8 }
      }
    ];

    for (const tool of defaultTools) {
      if (!existingTypes.has(tool.toolType)) {
        await this.prisma.aiAssistantTool.create({
          data: {
            assistantId,
            toolType: tool.toolType,
            isEnabled: tool.isEnabled,
            configJson: tool.configJson
          }
        });
      }
    }
  }

  async getTools(tenantId: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    return this.prisma.aiAssistantTool.findMany({
      where: { assistantId: assistant.id }
    });
  }

  async updateTool(
    tenantId: string,
    toolType: string,
    isEnabled?: boolean,
    configJson?: any
  ) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    
    // Schema validation for tool config
    let validatedConfig = configJson;
    if (configJson !== undefined && configJson !== null) {
      validatedConfig = await this.toolConfigValidator.validateToolConfig(toolType, configJson);
    }

    if (isEnabled === true) {
      const toolFeatureMap: Record<string, string> = {
        order_placement: 'ai_tool_order_placement',
        image_reading: 'ai_tool_image_reading',
        support_detection: 'ai_tool_support_detection',
        product_matching: 'ai_tool_product_matching'
      };
      const featureKey = toolFeatureMap[toolType];
      if (featureKey) {
        const allowed = await this.quotaService.checkFeature(tenantId, featureKey).catch(() => false);
        if (!allowed) {
          throw new BadRequestException(`Your current subscription plan does not allow enabling the ${toolType} AI tool.`);
        }
      }
    }

    const existing = await this.prisma.aiAssistantTool.findFirst({
      where: { assistantId: assistant.id, toolType }
    });

    if (existing) {
      return this.prisma.aiAssistantTool.update({
        where: { id: existing.id },
        data: {
          ...(isEnabled !== undefined ? { isEnabled } : {}),
          ...(validatedConfig !== undefined ? { configJson: validatedConfig } : {})
        }
      });
    } else {
      return this.prisma.aiAssistantTool.create({
        data: {
          assistantId: assistant.id,
          toolType,
          isEnabled: isEnabled ?? false,
          configJson: validatedConfig ?? this.toolConfigValidator.getDefaultConfigForTool(toolType)
        }
      });
    }
  }

  async getConfig(tenantId: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    
    // Check if the tenant's plan allows BYOK
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
          orderBy: { currentPeriodEnd: 'desc' },
          take: 1
        }
      }
    });

    const activeSub = tenant?.subscriptions?.[0];
    const allowByok = tenant?.customAllowByok ?? activeSub?.plan?.allowByok ?? false;

    return {
      routingMode: assistant.routingMode,
      systemPrompt: assistant.systemPrompt,
      hasCustomKey: !!assistant.byokApiKeyEncrypted,
      byokApiKeyEncryptedAt: assistant.byokApiKeyEncryptedAt,
      aiOrderEnabled: assistant.aiOrderEnabled,
      isActive: assistant.isActive,
      agentName: assistant.agentName,
      allowByok,
      planName: activeSub?.plan?.name || 'No Active Plan',
      aiQuota: activeSub?.plan?.aiQuota || 0,
      websiteUrl: tenant?.websiteUrl || null,
      websiteSummary: tenant?.websiteSummary || null
    };
  }

  async fetchWebsiteSummary(tenantId: string, url: string) {
    if (!url || !url.trim()) {
      throw new BadRequestException('Website URL is required');
    }

    // 1. Quota Check (Requires at least 2 AI response credits)
    await this.quotaService.checkAiQuota(tenantId);
    
    // Additional check to ensure user has at least 2 credits left
    const { aiQuota } = await this.quotaService.getActivePeriodForTenant(tenantId);
    const aiUsed = await this.prisma.aiUsageLog.count({
      where: { tenantId, createdAt: { gte: (await this.quotaService.getActivePeriodForTenant(tenantId)).periodStart } }
    });

    if (aiUsed + 2 > aiQuota) {
      throw new BadRequestException(`Insufficient AI response credits (${aiUsed}/${aiQuota}). Fetching website knowledge requires 2 credits.`);
    }

    const assistant = await this.ensureAiAssistantExists(tenantId);

    // Deduct 2 AI Usage Log Credits (1 for Crawl/Fetch + 1 for Summarization)
    await this.prisma.aiUsageLog.createMany({
      data: [
        { tenantId, assistantId: assistant.id, tokensUsed: 500, costUsd: 0.001 },
        { tenantId, assistantId: assistant.id, tokensUsed: 1500, costUsd: 0.003 },
      ]
    });

    // 2. Crawl Website Pages
    const { combinedText, pageCount } = await this.websiteCrawlerService.crawlWebsite(url, 12);

    if (!combinedText || combinedText.trim().length < 30) {
      throw new BadRequestException('Could not extract readable text from the provided website URL. Please check the URL.');
    }

    // 3. Summarize with AI into <= 3000 chars
    const prompt = `You are an expert AI knowledge summarizer for customer support.
Extract the core business information, products/services offered, FAQs, policies, working hours, and contact details from the following website content.

MANDATORY RULES:
1. Summarize into clear, clean, structured bullet points.
2. Provide explanations in both Bengali and English where relevant.
3. STRICT LIMIT: The summary MUST NOT exceed 3000 characters total.

WEBSITE CONTENT:
${combinedText}`;

    let summaryText = '';
    try {
      summaryText = await this.aiService.generateCompletion(prompt);
    } catch (err: any) {
      this.logger.error(`AI Summarization error: ${err.message}`);
      // Fallback truncated raw text
      summaryText = combinedText.substring(0, 2900);
    }

    if (summaryText.length > 3000) {
      summaryText = summaryText.substring(0, 2990) + '...';
    }

    const summaryPayload = {
      summary: summaryText,
      charCount: summaryText.length,
      pageCount,
      lastFetchedAt: new Date().toISOString()
    };

    // 4. Save to Tenant DB
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        websiteUrl: url.trim(),
        websiteSummary: summaryPayload
      }
    });

    await this.aiCacheService.invalidateCache(tenantId);

    return {
      success: true,
      websiteUrl: url.trim(),
      websiteSummary: summaryPayload
    };
  }

  async updateSystemPrompt(tenantId: string, systemPrompt: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    const updated = await this.prisma.aiAssistant.update({
      where: { id: assistant.id },
      data: { systemPrompt }
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return updated;
  }

  async generateSamplePrompt(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { labels: true }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    let prompt = `You are a polite, helpful AI assistant for ${tenant.businessName}.\n\n`;
    prompt += `### MANDATORY ANTI-HALLUCINATION GUARDRAILS:\n`;
    prompt += `1. ALWAYS use Q&A/Documents first as the source of truth.\n`;
    prompt += `2. NEVER invent products, features, or prices.\n`;
    prompt += `3. Never promise discounts or refunds without strict authorization.\n`;
    prompt += `4. If uncertain, explicitly state that you do not know and suggest human handoff.\n\n`;
    prompt += `### AI TRAINING TOOLS & MENU CAPABILITIES:\n`;
    prompt += `- **Product Catalog & Matching**: Search product catalog, recommend matching items with exact prices & stock availability.\n`;
    prompt += `- **Order Placement**: Collect customer Name, Phone, Delivery Address, and Quantity before confirming orders.\n`;
    prompt += `- **Image Vision**: Analyze product photos or receipts sent by customers and respond accurately.\n`;
    prompt += `- **Support Detection**: Automatically detect complaints or human agent requests and flag support tickets.\n`;
    prompt += `- **Q&A & Website Info**: Refer to Q&A knowledge base and website summary for office hours, delivery policy & store location.\n\n`;

    const activeLabels = tenant.labels.filter(l => l.aiPrompt && l.aiPrompt.trim().length > 0);
    
    if (activeLabels.length > 0) {
      prompt += `### Auto-Labeling Instructions\n`;
      prompt += `You have the ability to automatically label conversations based on the user's intent. If the user's messages match any of the following criteria, you must internally suggest the appropriate label:\n\n`;
      
      activeLabels.forEach(label => {
        prompt += `- **${label.name}**: ${label.aiPrompt}\n`;
      });
    }

    return { prompt };
  }

  async updateByokConfig(tenantId: string, routingMode: string, apiKey?: string, aiOrderEnabled?: boolean, isActive?: boolean, replyWhenAssigned?: boolean, agentName?: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    const planInfo = await this.getConfig(tenantId);

    if (routingMode !== 'system_only' && !planInfo.allowByok) {
      throw new BadRequestException('Your current plan does not allow BYOK features.');
    }

    const dataToUpdate: any = { routingMode };
    
    // Encrypt API key using AES-256-GCM before saving to database
    if (apiKey !== undefined) {
      if (apiKey && apiKey.trim().length > 0) {
        dataToUpdate.byokApiKeyEncrypted = this.cryptoService.encrypt(apiKey.trim());
        dataToUpdate.byokApiKeyEncryptedAt = new Date();
      } else {
        dataToUpdate.byokApiKeyEncrypted = null;
        dataToUpdate.byokApiKeyEncryptedAt = null;
      }
    }
    
    if (aiOrderEnabled !== undefined) {
      dataToUpdate.aiOrderEnabled = aiOrderEnabled;
    }
    
    if (isActive !== undefined) {
      dataToUpdate.isActive = isActive;
    }

    if (replyWhenAssigned !== undefined) {
      dataToUpdate.replyWhenAssigned = replyWhenAssigned;
    }

    if (agentName !== undefined) {
      dataToUpdate.agentName = agentName;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await this.prisma.aiAssistant.update({
        where: { id: assistant.id },
        data: dataToUpdate
      });
    }

    return { success: true };
  }

  async getDecryptedByokKey(tenantId: string): Promise<string | null> {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    if (!assistant.byokApiKeyEncrypted) {
      return null;
    }
    try {
      return this.cryptoService.decrypt(assistant.byokApiKeyEncrypted);
    } catch (error) {
      console.error(`[SECURITY] Failed to decrypt BYOK key for tenant ${tenantId}`);
      throw new InternalServerErrorException('Failed to decrypt custom API key');
    }
  }

  async getQnaList(tenantId: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);

    // Clean up any legacy default Q&As beyond the standard 2 concise defaults
    await this.prisma.qnAKnowledgeBase.deleteMany({
      where: {
        tenantId,
        isDefault: true,
        question: {
          notIn: [
            "What are your business opening hours?",
            "What is your delivery policy and charge?"
          ]
        }
      }
    });

    // Check if initial Q&A seeding marker exists for this tenant
    const seedMarker = await this.prisma.aiAssistantTool.findFirst({
      where: { assistantId: assistant.id, toolType: 'qna_initial_seeded' }
    });

    let qnas = await this.prisma.qnAKnowledgeBase.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Seed ONLY on first time initialization (max 2 concise questions)
    if (!seedMarker) {
      if (qnas.length === 0) {
        const defaultQuestions = [
          {
            question: "What are your business opening hours?",
            answer: "We are open Monday to Saturday from 9:00 AM to 8:00 PM."
          },
          {
            question: "What is your delivery policy and charge?",
            answer: "We deliver nationwide. Standard delivery takes 24-48 hours inside capital city and 3-5 days outside."
          }
        ];

        for (const item of defaultQuestions) {
          await this.prisma.qnAKnowledgeBase.create({
            data: {
              tenantId,
              question: item.question,
              answer: item.answer,
              isDefault: true
            }
          });
        }

        // Refetch after seeding
        qnas = await this.prisma.qnAKnowledgeBase.findMany({
          where: { tenantId },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'asc' }
          ]
        });
      }

      // Mark seeding as completed so future deletions persist forever
      await this.prisma.aiAssistantTool.create({
        data: {
          assistantId: assistant.id,
          toolType: 'qna_initial_seeded',
          isEnabled: true,
          configJson: { seededAt: new Date().toISOString() }
        }
      });
    }

    return qnas;
  }

  async createCustomQna(tenantId: string, question: string, answer: string) {
    const existingCount = await this.prisma.qnAKnowledgeBase.count({ where: { tenantId } });
    if (existingCount >= 20) {
      throw new BadRequestException('Maximum 20 Q&As allowed per tenant');
    }

    const qna = await this.prisma.qnAKnowledgeBase.create({
      data: {
        tenantId,
        question,
        answer,
        isDefault: false
      }
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return qna;
  }

  async updateQna(tenantId: string, id: string, question?: string, answer?: string) {
    const existing = await this.prisma.qnAKnowledgeBase.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException('Q&A not found');
    }

    const data: any = {};
    if (answer !== undefined) data.answer = answer;
    
    // Allow changing question of default QnA as well
    if (question !== undefined) {
      data.question = question;
    }

    const updated = await this.prisma.qnAKnowledgeBase.update({
      where: { id },
      data
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return updated;
  }

  async deleteQna(tenantId: string, id: string) {
    const existing = await this.prisma.qnAKnowledgeBase.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException('Q&A not found');
    }

    await this.prisma.qnAKnowledgeBase.delete({
      where: { id }
    });
    await this.aiCacheService.invalidateCache(tenantId);
    return { success: true };
  }

  async importVerticalPresetQnas(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    let nature: any = null;
    if (tenant?.businessNature) {
      nature = await this.prisma.businessNature.findFirst({
        where: { name: tenant.businessNature }
      });
    }
    let presetItems: { question: string; answer: string }[] = [];

    if (nature?.isPropertyMode) {
      presetItems = [
        { question: "How can I book a physical property visit or site viewing?", answer: "You can schedule a property visit by telling us your preferred date, time, and contact phone number. Our property agent will confirm your appointment." },
        { question: "What legal documents are required for purchasing or renting a property?", answer: "For purchasing or renting, you will need National ID / Passport copy, photographs, and proof of income or bank statement." },
        { question: "What are the payment terms and installment plans?", answer: "We offer flexible down payment options followed by monthly EMI / installment schedules depending on project completion stage." }
      ];
    } else if (nature?.isHospitalityMode) {
      presetItems = [
        { question: "What are the standard check-in and check-out times?", answer: "Standard check-in time is 2:00 PM and check-out time is 12:00 PM. Early check-in or late check-out is subject to room availability." },
        { question: "Is breakfast included in the room booking fee?", answer: "Complimentary breakfast is included with select room & suite packages. Please check room details at time of reservation." },
        { question: "What is your reservation cancellation policy?", answer: "Free cancellation is allowed up to 48 hours before check-in date. Cancellations within 48 hours may incur a 1-night room charge." }
      ];
    } else if (nature?.isTechSoftwareMode) {
      presetItems = [
        { question: "How can I request a live demo or schedule a product walkthrough?", answer: "You can request a free live demo by providing your email and phone number. Our product specialist will send a meeting link." },
        { question: "Do you offer a free trial period?", answer: "Yes, we offer a 14-day full-access free trial with no credit card required." },
        { question: "What are your customer support SLAs and response times?", answer: "We offer 24/7 dedicated email & live chat support with priority response under 1 hour for business subscribers." }
      ];
    } else if (nature?.isFinancialServiceMode) {
      presetItems = [
        { question: "How does the initial financial/tax consultation process work?", answer: "Our senior consultant reviews your business requirements during a 30-minute initial discovery call before presenting custom service packages." },
        { question: "What documents should I prepare before consultation?", answer: "Please prepare recent financial statements, tax identification numbers (TIN), and company registration documents." },
        { question: "Are all client disclosures kept strictly confidential?", answer: "Yes, all client data and discussions are strictly protected under non-disclosure agreements (NDA) and financial confidentiality compliance." }
      ];
    } else if (nature?.isHealthcareMode) {
      presetItems = [
        { question: "How can I book a doctor appointment or care service?", answer: "You can request an appointment by specifying your preferred doctor, medical specialty, and target date." },
        { question: "What should I bring on the day of my appointment?", answer: "Please bring your previous medical history/prescriptions, diagnostic test reports, and National ID." },
        { question: "How do I handle medical emergencies or urgent consults?", answer: "For life-threatening emergencies, please call emergency services immediately or visit our 24/7 emergency clinic desk." }
      ];
    } else if (nature?.isEducationMode) {
      presetItems = [
        { question: "What are the admission requirements and eligibility criteria?", answer: "Admission requirements vary by program. Generally, completed academic transcripts and a photo ID are required." },
        { question: "What is the duration and class schedule for upcoming batches?", answer: "Class duration ranges from 3 to 6 months with flexible weekend and weekday evening batch options." },
        { question: "Will I receive a verified certificate upon completion?", answer: "Yes, all passing students receive an industry-recognized digital & printed certificate upon final assessment." }
      ];
    } else if (nature?.isManufacturingMode) {
      presetItems = [
        { question: "What is your Minimum Order Quantity (MOQ) policy?", answer: "Each factory product line has a minimum order quantity specified in our catalog. Custom bulk quotes are available for large orders." },
        { question: "Can I request sample product units before placing a bulk order?", answer: "Yes, sample units can be dispatched upon request. Sample fees are deductible from your final bulk order payment." },
        { question: "What is the typical production lead time for wholesale orders?", answer: "Standard production lead time is 14-21 business days following order approval and deposit payment." }
      ];
    } else if (nature?.isLogisticsMode) {
      presetItems = [
        { question: "How can I request a freight quote for shipping cargo?", answer: "Please provide origin city, destination city, cargo weight in tons/CBM, and preferred vehicle type (Covered Van, Flatbed, Trailer)." },
        { question: "How do I track my active shipment status?", answer: "Shippers receive real-time SMS & messaging tracking updates upon container dispatch and waypoint check-ins." },
        { question: "What is your goods transit insurance coverage?", answer: "We offer optional comprehensive transit insurance covering loss or damage during highway transport." }
      ];
    } else {
      presetItems = [
        { question: "What are your business opening hours?", answer: "We are open Monday to Saturday from 9:00 AM to 8:00 PM." },
        { question: "What is your delivery policy and charge?", answer: "We deliver across the country. Delivery takes 24-48 hours inside capital city and 3-5 days outside." },
        { question: "What payment methods do you accept?", answer: "We accept Cash on Delivery (COD), Mobile Banking (bKash/Nagad/Rocket), and Credit/Debit cards." }
      ];
    }

    let addedCount = 0;
    const existingQnas = await this.prisma.qnAKnowledgeBase.findMany({ where: { tenantId } });

    if (existingQnas.length >= 20) {
      throw new BadRequestException('Maximum 20 Q&As limit reached for this workspace.');
    }

    for (const item of presetItems) {
      if (existingQnas.length + addedCount >= 20) break;
      const alreadyExists = existingQnas.some(q => q.question.toLowerCase() === item.question.toLowerCase());
      if (!alreadyExists) {
        await this.prisma.qnAKnowledgeBase.create({
          data: {
            tenantId,
            question: item.question,
            answer: item.answer,
            isDefault: false
          }
        });
        addedCount++;
      }
    }

    await this.aiCacheService.invalidateCache(tenantId);
    return { success: true, count: addedCount, message: `Imported ${addedCount} vertical preset Q&As` };
  }

  async getDocuments(tenantId: string) {
    return this.prisma.knowledgeDocument.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        status: true,
        fileType: true,
        fileSizeBytes: true,
        errorMessage: true,
        uploadedAt: true
      }
    });
  }

  async uploadDocument(tenantId: string, file: any) {
    const existingCount = await this.prisma.knowledgeDocument.count({ where: { tenantId } });
    if (existingCount >= 2) throw new BadRequestException('Maximum 2 documents allowed per tenant');

    if (file.size > 500 * 1024) {
      throw new BadRequestException('File size must be 500KB or less');
    }

    // Strict file & magic number validation
    const { detectedType } = this.fileValidationService.validateFile(file);

    // Create DB entry with metadata
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        tenantId,
        filename: file.originalname,
        fileType: detectedType,
        fileSizeBytes: file.size,
        status: 'processing',
        processingStartedAt: new Date()
      }
    });

    // Parse async with 60s timeout
    this.processDocumentWithTimeout(doc.id, file, 60000).catch(err => {
      console.error(`[DOCUMENT TIMEOUT ERROR] Document ${doc.id}:`, err.message);
    });

    return doc;
  }

  private async processDocumentWithTimeout(docId: string, file: any, timeoutMs: number = 60000) {
    try {
      await Promise.race([
        this.processDocument(docId, file),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Document processing timeout after ${timeoutMs / 1000}s`)), timeoutMs)
        )
      ]);
    } catch (error: any) {
      console.error(`Document processing failed for ${docId}:`, error.message);
      await this.prisma.knowledgeDocument.update({
        where: { id: docId },
        data: {
          status: 'failed',
          errorMessage: error.message?.substring(0, 500) || 'Processing failed'
        }
      });
    }
  }

  private async processDocument(docId: string, file: any) {
    try {
      let text = '';
      const mime = file.mimetype;
      const ext = file.originalname?.split('.').pop()?.toLowerCase();

      if (mime === 'application/pdf' || ext === 'pdf') {
        const data = await pdfParse(file.buffer);
        text = data.text;
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value;
      } else if (mime?.startsWith('image/')) {
        const worker = await createWorker('eng');
        const ocrPromise = worker.recognize(file.buffer);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OCR processing timed out after 30 seconds')), 30000)
        );
        const ret: any = await Promise.race([ocrPromise, timeoutPromise]);
        text = ret.data.text;
        await worker.terminate();
      } else {
        text = file.buffer.toString('utf-8');
      }

      if (!text || text.trim() === '') {
        await this.prisma.knowledgeDocument.update({
          where: { id: docId },
          data: { status: 'failed', errorMessage: 'Document contains no extractable text content' }
        });
        return;
      }

      // Chunk text (simple chunking, 500 chars)
      const chunkSize = 500;
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }

      const TARGET_DIMENSION = 768; // Gemini text-embedding-004 output dimension

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (chunk.length < 10) continue;

        try {
          // Use Gemini text-embedding-004 (768-dim) — aligned with vector(768) schema
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY is not configured for embedding generation.');
          }

          const embRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text: chunk }] } }),
            }
          );

          if (!embRes.ok) {
            const errBody = await embRes.text();
            throw new Error(`Gemini Embedding API error (${embRes.status}): ${errBody}`);
          }

          const embJson = await embRes.json();
          const vector: number[] = embJson?.embedding?.values;

          if (!Array.isArray(vector)) {
            throw new Error('Gemini embedding response did not contain a valid values array.');
          }

          // Runtime dimension guard — prevents cryptic pgvector dimension mismatch errors
          if (vector.length !== TARGET_DIMENSION) {
            throw new Error(
              `Embedding dimension mismatch: expected ${TARGET_DIMENSION}, got ${vector.length}. ` +
              `Ensure the embedding model matches the database schema vector(${TARGET_DIMENSION}).`
            );
          }

          // pgvector raw query for insertion
          await this.prisma.$executeRaw`
            INSERT INTO knowledge_chunks (id, "documentId", content, embedding, "chunkIndex")
            VALUES (gen_random_uuid(), ${docId}::uuid, ${chunk}, ${`[${vector.join(',')}]`}::vector, ${i});
          `;
        } catch (embErr) {
          console.error('Embedding error', embErr);
        }
      }


      await this.prisma.knowledgeDocument.update({
        where: { id: docId },
        data: {
          status: 'completed',
          processingCompletedAt: new Date()
        }
      });
    } catch (e: any) {
      console.error(e);
      await this.prisma.knowledgeDocument.update({
        where: { id: docId },
        data: {
          status: 'failed',
          errorMessage: e.message?.substring(0, 500) || 'Parsing error'
        }
      });
    }
  }

  async deleteDocument(tenantId: string, id: string) {
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Document not found');

    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: id } });
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    await this.aiCacheService.invalidateCache(tenantId);

    return { success: true };
  }

  async testSimulate(tenantId: string, message: string) {
    if (!message || message.trim().length === 0) {
      throw new BadRequestException('Message is required');
    }

    // 1. Check AI Quota (deducts 1 credit or throws if depleted)
    await this.quotaService.checkAiQuota(tenantId);

    // 2. Build prompt context — MUST MIRROR OrchestratorService.buildPrompt() exactly
    const assistant = await this.ensureAiAssistantExists(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    // Fetch all knowledge sources
    const qnas = await this.prisma.qnAKnowledgeBase.findMany({ where: { tenantId, isActive: true } });
    const freshDocs = await this.prisma.knowledgeDocument.findMany({
      where: { tenantId, status: 'completed' },
      include: { chunks: { take: 5 } },
      take: 5
    });
    const products = await this.aiService.searchRelevantProducts(tenantId, message, 5);

    // Fetch Active Labels/Tag Rules (PARITY WITH ORCHESTRATOR — was missing!)
    const activeLabels = await this.prisma.label.findMany({
      where: { tenantId, isActive: true }
    });

    // Resolve vertical mode from businessNature string
    let bn: any = null;
    if ((tenant as any)?.businessNature) {
      bn = await this.prisma.businessNature.findFirst({
        where: { name: (tenant as any).businessNature }
      });
    }
    const isPropertyMode        = bn?.isPropertyMode        ?? false;
    const isHospitalityMode     = bn?.isHospitalityMode     ?? false;
    const isTechSoftwareMode    = bn?.isTechSoftwareMode    ?? false;
    const isFinancialServiceMode= bn?.isFinancialServiceMode?? false;
    const isHealthcareMode      = bn?.isHealthcareMode      ?? false;
    const isEducationMode       = bn?.isEducationMode       ?? false;
    const isManufacturingMode   = bn?.isManufacturingMode   ?? false;
    const isLogisticsMode       = bn?.isLogisticsMode       ?? false;

    // ── STATIC HEADER (mirrors OrchestratorService Section 1) ──────────────
    let prompt = `You are a helpful AI assistant for ${tenant?.businessName || 'this business'}.\n`;
    prompt += `\n=== MANDATORY ANTI-HALLUCINATION GUARDRAILS ===\n`;
    prompt += `1. ALWAYS use Q&A/Documents first as the source of truth.\n`;
    prompt += `2. NEVER invent products, features, or prices.\n`;
    prompt += `3. Never promise discounts or refunds without strict authorization.\n`;
    prompt += `4. If uncertain, explicitly state that you do not know and suggest human handoff.\n`;

    const systemPrompt = assistant.agentName
      ? `Your name is ${assistant.agentName}. ${assistant.systemPrompt || ''}`
      : (assistant.systemPrompt || '');
    if (systemPrompt) {
      prompt += `\nYour Core Instructions:\n${systemPrompt}\n`;
    }

    // ── Labels / Tag Rules (was MISSING — now added for parity) ─────────────
    const tagsWithPrompts = activeLabels.filter(t => t.aiPrompt);
    if (tagsWithPrompts.length > 0) {
      prompt += `\n--- CONVERSATION TAGS RULES ---\n`;
      prompt += `The following tags are active. If the customer's query matches any of these tag rules, you MUST apply its instruction/prompt to compose your response and return the matched tag name inside the "matchedTags" JSON array:\n`;
      tagsWithPrompts.forEach(tag => {
        prompt += `- Tag: "${tag.name}"\n  Rule/Instruction: "${tag.aiPrompt}"\n`;
      });
    }

    // ── DYNAMIC FOOTER ──────────────────────────────────────────────────────
    // Website Summary
    let websiteSummaryText = '';
    if (tenant?.websiteSummary) {
      const ws: any = tenant.websiteSummary;
      if (typeof ws === 'string') {
        try { websiteSummaryText = JSON.parse(ws).summary || ws; } catch { websiteSummaryText = ws; }
      } else if (typeof ws === 'object' && ws !== null) {
        websiteSummaryText = ws.summary || ws.text || JSON.stringify(ws);
      }
    }
    if (websiteSummaryText.trim()) {
      prompt += `\n--- VERIFIED WEBSITE KNOWLEDGE SUMMARY ---\n${websiteSummaryText.trim()}\n`;
    }

    // Q&A
    if (qnas.length > 0) {
      prompt += `\n--- Q&A KNOWLEDGE BASE ---\n`;
      qnas.forEach((q: any) => {
        if (q.answer?.trim()) prompt += `Q: ${q.question}\nA: ${q.answer}\n`;
      });
    }

    // Documents
    if (freshDocs.length > 0) {
      prompt += `\n--- KNOWLEDGE DOCUMENTS ---\n`;
      freshDocs.forEach((d: any) => {
        prompt += `[Doc: ${d.filename}]\n`;
        (d.chunks || []).forEach((c: any) => { prompt += `Content: ${c.content}\n`; });
      });
    }

    // ── Product Catalog — Vertical-Aware (mirrors Orchestrator exactly) ─────
    if (products.length > 0) {
      if (isPropertyMode) {
        prompt += `\n--- PROPERTY LISTINGS ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request' : `BDT ${p.price}`;
          prompt += `- [${(p.listingType || '').toUpperCase()}] ${p.name}`;
          if (p.location) prompt += ` | 📍 ${p.location}`;
          if (attrs.area) prompt += ` | 📐 ${attrs.area} sqft`;
          if (attrs.bedrooms) prompt += ` | 🛏 ${attrs.bedrooms} BR`;
          if (attrs.bathrooms) prompt += ` | 🚿 ${attrs.bathrooms} Bath`;
          prompt += ` | 🔖 Status: ${attrs.propertyStatus || 'available'} | 💰 ${priceStr}\n`;
        });
      } else if (isHospitalityMode) {
        prompt += `\n--- HOTEL ROOMS & SUITES ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Rate on Request' : `BDT ${p.price}/night`;
          prompt += `- [${(attrs.roomType || '').toUpperCase()}] ${p.name}`;
          if (attrs.capacity || attrs.maxGuests) prompt += ` | 👥 Max ${attrs.capacity || attrs.maxGuests}`;
          if (attrs.bedType) prompt += ` | 🛏 ${attrs.bedType}`;
          if (attrs.amenities) prompt += ` | ✨ ${Array.isArray(attrs.amenities) ? attrs.amenities.join(', ') : attrs.amenities}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isTechSoftwareMode) {
        prompt += `\n--- SOFTWARE & TECH PACKAGES ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request' : `BDT ${p.price}/mo`;
          prompt += `- [${(attrs.tier || '').toUpperCase()}] ${p.name}`;
          if (attrs.features) prompt += ` | ⚡ ${Array.isArray(attrs.features) ? attrs.features.join(', ') : attrs.features}`;
          if (attrs.maxUsers) prompt += ` | 👥 Max Users: ${attrs.maxUsers}`;
          if (attrs.demoUrl) prompt += ` | 🔗 Demo: ${attrs.demoUrl}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isHealthcareMode) {
        prompt += `\n--- DOCTORS & CLINIC SERVICES ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price}`;
          prompt += `- Dr. ${p.name}`;
          if (attrs.specialization || attrs.specialty) prompt += ` | 🩺 ${attrs.specialization || attrs.specialty}`;
          if (attrs.visitingHours) prompt += ` | 🕒 ${attrs.visitingHours}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isEducationMode) {
        prompt += `\n--- COURSES & ACADEMIC PROGRAMS ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price}`;
          prompt += `- ${p.name}`;
          if (attrs.duration || attrs.courseDuration) prompt += ` | ⏳ ${attrs.duration || attrs.courseDuration}`;
          if (attrs.batchSchedule) prompt += ` | 📅 ${attrs.batchSchedule}`;
          if (attrs.instructor) prompt += ` | 👨‍🏫 ${attrs.instructor}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isManufacturingMode) {
        prompt += `\n--- B2B WHOLESALE & FACTORY PRODUCTS ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request (RFQ)' : `BDT ${p.price}/unit`;
          prompt += `- ${p.name}`;
          if (attrs.moq || attrs.minimumOrderQty) prompt += ` | 📦 MOQ: ${attrs.moq || attrs.minimumOrderQty}`;
          if (attrs.material) prompt += ` | 🧵 Material: ${attrs.material}`;
          if (attrs.leadTime) prompt += ` | ⏱ Lead Time: ${attrs.leadTime}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isLogisticsMode) {
        prompt += `\n--- LOGISTICS & SHIPMENT SERVICES ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Rate on Request' : `BDT ${p.price}`;
          prompt += `- ${p.name}`;
          if (attrs.route || attrs.originDestination) prompt += ` | 🛣 ${attrs.route || attrs.originDestination}`;
          if (attrs.vehicleType) prompt += ` | 🚛 ${attrs.vehicleType}`;
          if (attrs.capacity) prompt += ` | ⚖ ${attrs.capacity}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else if (isFinancialServiceMode) {
        prompt += `\n--- SERVICE PACKAGES & CONSULTANCY ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Fee on Request' : `BDT ${p.price}`;
          prompt += `- ${p.name}`;
          if (attrs.scope) prompt += ` | 💼 ${attrs.scope}`;
          if (attrs.duration) prompt += ` | ⏳ ${attrs.duration}`;
          prompt += ` | 💰 ${priceStr}\n`;
        });
      } else {
        // Default retail / Other — inject ALL attributes (zero missed)
        prompt += `\n--- PRODUCT CATALOG ---\n`;
        products.forEach((p: any) => {
          const attrs = (p.attributes as any) || {};
          const priceStr = (!p.price || Number(p.price) <= 0) ? 'Price on Request' : `BDT ${p.price}`;
          prompt += `- ${p.name} | 💰 ${priceStr}`;
          if (p.sku) prompt += ` | SKU: ${p.sku}`;
          if (p.description) prompt += ` | 📝 ${p.description}`;
          if (p.trackInventory) prompt += ` | 📦 Stock: ${p.stockCount ?? 0}`;
          Object.entries(attrs)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .forEach(([k, v]) => { prompt += ` | ${k}: ${Array.isArray(v) ? (v as any[]).join(', ') : String(v)}`; });
          prompt += `\n`;
        });
      }
    }

    prompt += `\n--- CUSTOMER TEST QUERY ---\n${message}\n\nPlease reply directly to the customer as the trained AI assistant.`;

    let reply = '';
    try {
      reply = await this.aiService.generateCompletion(prompt);
    } catch (err: any) {
      reply = `Sorry, unable to process AI request (${err.message || 'AI service error'}). Please verify your AI configuration.`;
    }

    // 3. Log 1 AI Usage Credit
    await this.prisma.aiUsageLog.create({
      data: {
        tenantId,
        assistantId: assistant.id,
        tokensUsed: 150,
        costUsd: 0.0003
      }
    });

    return { reply };
  }


  async searchRelevantChunks(tenantId: string, queryVector: number[] | string, limit = 5) {
    if (!tenantId || tenantId.trim() === '') {
      throw new BadRequestException('tenantId is required for vector search');
    }

    const TARGET_DIMENSION = 768; // Gemini text-embedding-004

    // Validate query vector dimension before sending to PostgreSQL
    if (Array.isArray(queryVector) && queryVector.length !== TARGET_DIMENSION) {
      throw new BadRequestException(
        `Query vector dimension mismatch: expected ${TARGET_DIMENSION}, got ${queryVector.length}. ` +
        `Re-generate the query embedding using the correct model (Gemini text-embedding-004).`
      );
    }

    const vectorStr = Array.isArray(queryVector) ? `[${queryVector.join(',')}]` : queryVector;

    const chunks: any[] = await this.prisma.$queryRaw`
      SELECT kc.id, kc.content, kc."documentId", kc."chunkIndex", (1 - (kc.embedding <=> ${vectorStr}::vector)) as similarity
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc."documentId" = kd.id
      WHERE kd."tenantId" = ${tenantId}::uuid AND kd.status = 'completed'
      ORDER BY kc.embedding <=> ${vectorStr}::vector
      LIMIT ${limit};
    `;

    return chunks;
  }
}
