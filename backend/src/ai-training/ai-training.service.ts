import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import OpenAI from 'openai';
import { createWorker } from 'tesseract.js';

@Injectable()
export class AiTrainingService {
  constructor(private prisma: PrismaService) {}

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
    return assistant;
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

    const activeSub = tenant?.subscriptions[0];
    const allowByok = activeSub?.plan?.allowByok || false;

    return {
      routingMode: assistant.routingMode,
      systemPrompt: assistant.systemPrompt,
      hasCustomKey: !!assistant.byokApiKeyEncrypted,
      aiOrderEnabled: assistant.aiOrderEnabled,
      isActive: assistant.isActive,
      replyWhenAssigned: assistant.replyWhenAssigned,
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

  async updateByokConfig(tenantId: string, routingMode: string, apiKey?: string, aiOrderEnabled?: boolean, isActive?: boolean, replyWhenAssigned?: boolean) {
    const assistant = await this.ensureAiAssistantExists(tenantId);
    const planInfo = await this.getConfig(tenantId);

    if (routingMode !== 'system_only' && !planInfo.allowByok) {
      throw new BadRequestException('Your current plan does not allow BYOK features.');
    }

    const dataToUpdate: any = { routingMode };
    
    // Only update API key if provided (don't overwrite with null if they just change routing mode)
    if (apiKey !== undefined) {
      // In a real production app, encrypt this using AES-256 before saving
      dataToUpdate.byokApiKeyEncrypted = apiKey ? apiKey : null;
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

    await this.prisma.aiAssistant.update({
      where: { id: assistant.id },
      data: dataToUpdate
    });

    return { success: true };
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
    if (!question || !answer) {
      throw new BadRequestException('Question and answer are required');
    }

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
      select: { id: true, filename: true, status: true, uploadedAt: true }
    });
  }

  async uploadDocument(tenantId: string, file: any) {
    const existingCount = await this.prisma.knowledgeDocument.count({ where: { tenantId } });
    if (existingCount >= 2) throw new BadRequestException('Maximum 2 documents allowed');

    if (file.size > 1024 * 1024) throw new BadRequestException('File size exceeds 1MB limit');

    // Create DB entry
    const doc = await this.prisma.knowledgeDocument.create({
      data: { tenantId, filename: file.originalname, status: 'processing' }
    });

    // Parse async
    this.processDocument(doc.id, file).catch(err => console.error('Processing error', err));

    return doc;
  }

  private async processDocument(docId: string, file: any) {
    try {
      let text = '';
      const mime = file.mimetype;
      const ext = file.originalname.split('.').pop()?.toLowerCase();

      if (mime === 'application/pdf' || ext === 'pdf') {
        const data = await pdfParse(file.buffer);
        text = data.text;
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value;
      } else if (mime.startsWith('image/')) {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(file.buffer);
        text = ret.data.text;
        await worker.terminate();
      } else {
        text = file.buffer.toString('utf-8');
      }

      if (!text || text.trim() === '') {
        await this.prisma.knowledgeDocument.update({ where: { id: docId }, data: { status: 'failed' } });
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

      await this.prisma.knowledgeDocument.update({ where: { id: docId }, data: { status: 'completed' } });
    } catch (e) {
      console.error(e);
      await this.prisma.knowledgeDocument.update({ where: { id: docId }, data: { status: 'failed' } });
    }
  }

  async deleteDocument(tenantId: string, id: string) {
    const existing = await this.prisma.knowledgeDocument.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Document not found');

    // Chunks are implicitly removed if we add ON DELETE CASCADE to DB, but schema didn't have it so we delete manually
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId: id } });
    await this.prisma.knowledgeDocument.delete({ where: { id } });

    return { success: true };
  }
}
