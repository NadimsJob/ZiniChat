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

@Injectable()
export class AiTrainingService {
  constructor(
    private prisma: PrismaService,
    private quotaService: QuotaService,
    private cryptoService: CryptoService,
    private fileValidationService: FileValidationService,
    private toolConfigValidator: ToolConfigValidatorService
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
        configJson: { minMatchConfidence: 0.6 }
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
    };
  }

  async updateSystemPrompt(tenantId: string, systemPrompt: string) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    return this.prisma.aiAssistant.update({
      where: { id: assistant.id },
      data: { systemPrompt }
    });
  }

  async generateSamplePrompt(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { labels: true }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    let prompt = `You are a helpful and polite customer support assistant for ${tenant.businessName}.\n\n`;
    prompt += `Your rules:\n`;
    prompt += `1. Always greet the user politely.\n`;
    prompt += `2. Keep your answers short and to the point.\n`;
    prompt += `3. Do not make up information that is not provided in your knowledge base.\n`;
    prompt += `4. If you don't know the answer, ask the user to call our support number.\n\n`;

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
    let qnas = await this.prisma.qnAKnowledgeBase.findMany({
      where: { tenantId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    // Inject default questions if they don't exist
    if (qnas.filter(q => q.isDefault).length === 0) {
      const defaultQuestions = [
        "What are your business opening hours?",
        "What is your delivery policy and charge?",
        "Do you have a physical store location?",
        "What is your return or refund policy?",
        "What is your customer support contact number?",
        "What payment methods do you accept?",
        "Do you offer international shipping?",
        "How can a customer track their order?"
      ];

      for (const q of defaultQuestions) {
        await this.prisma.qnAKnowledgeBase.create({
          data: {
            tenantId,
            question: q,
            answer: '',
            isDefault: true
          }
        });
      }

      // Refetch
      qnas = await this.prisma.qnAKnowledgeBase.findMany({
        where: { tenantId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'asc' }
        ]
      });
    }

    return qnas;
  }

  async createCustomQna(tenantId: string, question: string, answer: string) {
    const qna = await this.prisma.qnAKnowledgeBase.create({
      data: {
        tenantId,
        question,
        answer,
        isDefault: false
      }
    });

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
    
    // Cannot change question of default QnA
    if (question !== undefined && !existing.isDefault) {
      data.question = question;
    }

    const updated = await this.prisma.qnAKnowledgeBase.update({
      where: { id },
      data
    });

    return updated;
  }

  async deleteQna(tenantId: string, id: string) {
    const existing = await this.prisma.qnAKnowledgeBase.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      throw new NotFoundException('Q&A not found');
    }

    if (existing.isDefault) {
      throw new BadRequestException('Cannot delete default business questions. You can clear the answer instead.');
    }

    await this.prisma.qnAKnowledgeBase.delete({
      where: { id }
    });

    return { success: true };
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

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i].trim();
        if (chunk.length < 10) continue;

        try {
          const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunk
          });
          
          const vector = embeddingRes.data[0].embedding;
          
          // pgvector raw query for insertion
          await this.prisma.$executeRaw`
            INSERT INTO knowledge_chunks (id, "documentId", content, embedding, "chunkIndex")
            VALUES (gen_random_uuid(), ${docId}::uuid, ${chunk}, ${vector}::vector, ${i});
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

    return { success: true };
  }
}
