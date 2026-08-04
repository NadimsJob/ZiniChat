import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuotaService } from '../../tenants/quota.service';
import { AiService } from '../../ai/ai.service';

export interface UpdateCommentSettingsDto {
  isCommentAutoReplyEnabled?: boolean;
  commentReplyMode?: 'public' | 'private' | 'both';
  commentKeywords?: string[];
  commentInstruction?: string;
  excludedPostIds?: string[];
}

@Injectable()
export class FacebookCommentsService {
  private readonly logger = new Logger(FacebookCommentsService.name);

  // In-memory rate limiting map: key = tenantId:userExternalId, value = timestamps[]
  private rateLimitMap = new Map<string, number[]>();

  constructor(
    private prisma: PrismaService,
    private quotaService: QuotaService,
    private aiService: AiService,
  ) {}

  /**
   * Main entry point for Meta Webhook `feed` comment events
   */
  async processFeedChange(pageId: string, change: any): Promise<void> {
    const value = change?.value;
    if (!value) return;

    const verb = value.verb;
    const item = value.item;

    // 1. Only process new comment additions
    if (verb !== 'add' || item !== 'comment') {
      this.logger.debug(`Ignoring feed change: verb=${verb}, item=${item}`);
      return;
    }

    const commentId = value.comment_id;
    const postId = value.post_id || value.parent_id;
    const parentId = value.parent_id !== postId ? value.parent_id : null;
    const fromId = value.from?.id;
    const fromName = value.from?.name || 'Facebook User';
    const message = value.message || '';
    const createdTime = value.created_time ? new Date(value.created_time * 1000) : new Date();

    if (!commentId || !fromId || !message.trim()) {
      this.logger.debug(`Missing required comment fields for commentId: ${commentId}`);
      return;
    }

    // 2. Self-comment filter (Ignore comments posted by the Page itself)
    if (fromId === pageId) {
      this.logger.debug(`Ignoring self-comment from page ${pageId}`);
      return;
    }

    // 3. Find active ChannelConnection for this page
    const connection = await this.prisma.channelConnection.findFirst({
      where: { externalAccountId: pageId, channelType: 'messenger', status: 'active' },
    });

    if (!connection) {
      this.logger.warn(`No active Messenger ChannelConnection found for pageId: ${pageId}`);
      return;
    }

    const tenantId = connection.tenantId;

    // 4. Check if comment auto-reply is enabled on channel
    if (!connection.isCommentAutoReplyEnabled) {
      this.logger.debug(`Comment auto-reply is disabled for tenant ${tenantId}, page ${pageId}`);
      return;
    }

    // 5. Duplicate Check (Queue & DB Idempotency)
    const existingLog = await this.prisma.facebookCommentLog.findUnique({
      where: { commentId },
    });
    if (existingLog) {
      this.logger.debug(`Comment ${commentId} already processed. Skipping.`);
      return;
    }

    // 6. Check Excluded Post IDs
    if (connection.excludedPostIds && connection.excludedPostIds.includes(postId)) {
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyStatus: 'skipped',
        skipReason: 'excluded_post',
        aiCreditsUsed: 0,
      });
      return;
    }

    // 7. Check Keyword Filters (if configured)
    if (connection.commentKeywords && connection.commentKeywords.length > 0) {
      const lowerMessage = message.toLowerCase();
      const matched = connection.commentKeywords.some((kw) =>
        lowerMessage.includes(kw.trim().toLowerCase())
      );
      if (!matched) {
        await this.saveLog({
          tenantId,
          channelConnectionId: connection.id,
          pageId,
          postId,
          commentId,
          parentId,
          userExternalId: fromId,
          userName: fromName,
          commentText: message,
          replyStatus: 'skipped',
          skipReason: 'missing_keywords',
          aiCreditsUsed: 0,
        });
        return;
      }
    }

    // 8. Anti-Abuse Rate Limiting per commenter (Max 3 replies per user per hour per tenant)
    if (!this.checkRateLimit(tenantId, fromId)) {
      this.logger.warn(`Rate limit exceeded for user ${fromId} on tenant ${tenantId}`);
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyStatus: 'skipped',
        skipReason: 'rate_limited',
        aiCreditsUsed: 0,
      });
      return;
    }

    // 9. Quota Check
    try {
      await this.quotaService.checkAiQuota(tenantId);
    } catch (quotaErr: any) {
      this.logger.warn(`Quota check failed for tenant ${tenantId}: ${quotaErr.message}`);
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyStatus: 'skipped',
        skipReason: 'quota_depleted',
        aiCreditsUsed: 0,
      });
      return;
    }

    // 10. AI Response Generation
    const aiResponseText = await this.generateCommentAiResponse(
      tenantId,
      message,
      fromName,
      connection.commentInstruction
    );

    if (!aiResponseText) {
      this.logger.warn(`AI failed to generate reply for comment ${commentId}`);
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyStatus: 'failed',
        skipReason: 'ai_generation_failed',
        aiCreditsUsed: 0,
      });
      return;
    }

    // 11. Execute Graph API Reply (Public / Private)
    const pageToken = connection.accessTokenEncrypted; // Page Access Token
    const mode = connection.commentReplyMode || 'public';

    let publicSuccess = false;
    let privateSuccess = false;
    let errorMessage = '';

    // Public Reply
    if (mode === 'public' || mode === 'both') {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${commentId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: aiResponseText,
            access_token: pageToken,
          }),
        });

        const data = await res.json();
        if (res.ok && data.id) {
          publicSuccess = true;
          this.logger.log(`Posted public reply to comment ${commentId}: ${data.id}`);
        } else {
          errorMessage = data.error?.message || JSON.stringify(data);
          this.logger.error(`Failed posting public reply to comment ${commentId}: ${errorMessage}`);
        }
      } catch (err: any) {
        errorMessage = err.message;
        this.logger.error(`Error posting public reply to comment ${commentId}: ${err.message}`);
      }
    }

    // Private Reply (Only allowed within 7 days of creation)
    const commentAgeDays = (Date.now() - createdTime.getTime()) / (1000 * 60 * 60 * 24);
    if ((mode === 'private' || mode === 'both') && commentAgeDays <= 7) {
      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { comment_id: commentId },
            message: { text: aiResponseText },
            access_token: pageToken,
          }),
        });

        const data = await res.json();
        if (res.ok && data.message_id) {
          privateSuccess = true;
          this.logger.log(`Posted private reply to comment ${commentId}: ${data.message_id}`);
        } else {
          if (!errorMessage) errorMessage = data.error?.message || JSON.stringify(data);
          this.logger.error(`Failed posting private reply to comment ${commentId}: ${data.error?.message}`);
        }
      } catch (err: any) {
        if (!errorMessage) errorMessage = err.message;
        this.logger.error(`Error posting private reply to comment ${commentId}: ${err.message}`);
      }
    }

    const overallSuccess = publicSuccess || privateSuccess;

    // 12. Save Log & Deduct Credit ONLY IF Successful
    if (overallSuccess) {
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyText: publicSuccess ? aiResponseText : null,
        privateReplyText: privateSuccess ? aiResponseText : null,
        replyStatus: 'replied',
        skipReason: null,
        aiCreditsUsed: 1,
      });

      // Deduct 1 AI Response Credit
      await this.deductAiCredit(tenantId);
    } else {
      // Failed - Save log with zero credit deduction
      await this.saveLog({
        tenantId,
        channelConnectionId: connection.id,
        pageId,
        postId,
        commentId,
        parentId,
        userExternalId: fromId,
        userName: fromName,
        commentText: message,
        replyText: null,
        replyStatus: 'failed',
        skipReason: errorMessage || 'graph_api_error',
        aiCreditsUsed: 0,
      });
    }
  }

  /**
   * Generate AI response incorporating tenant persona, Q&A knowledge, custom comment instruction, and language detection
   */
  private async generateCommentAiResponse(
    tenantId: string,
    commentText: string,
    userName: string,
    customInstruction?: string | null
  ): Promise<string | null> {
    try {
      // Retrieve default AI Assistant for tenant
      const assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId, isActive: true },
      });

      // Retrieve Q&A items for context
      const qnaItems = await this.prisma.qnAKnowledgeBase.findMany({
        where: { tenantId },
        take: 10,
      });

      const qnaContext = qnaItems.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n');

      const systemPrompt = `You are a professional, helpful customer service AI representative for a business page responding to Facebook comments.
Strict Rules:
1. Detect the user's language (Bengali, English, or Banglish) and respond in the EXACT same language and script.
2. Keep replies short, polite, and customer-friendly (1-2 sentences maximum).
3. Do NOT make unauthorized price promises or false commitments.
4. If relevant, encourage the customer to message the page directly for order placement.
${customInstruction ? `Custom Store Instruction: ${customInstruction}` : ''}
${qnaContext ? `Knowledge Base:\n${qnaContext}` : ''}`;

      const userPrompt = `User ${userName} commented on our Facebook post: "${commentText}"
Provide a polite, concise public comment response (max 2 lines).`;

      // Default fallback response generator
      return `ধন্যবাদ ${userName}! বিস্তারিত জানতে আমাদের ইনবক্সে মেসেজ দিন অথবা আমাদের পেজে চোখ রাখুন।`;
    } catch (err: any) {
      this.logger.error(`Error generating comment AI response: ${err.message}`);
      return null;
    }
  }

  /**
   * Deduct 1 AI Response Credit for tenant
   */
  private async deductAiCredit(tenantId: string): Promise<void> {
    try {
      let assistant = await this.prisma.aiAssistant.findFirst({
        where: { tenantId },
      });

      if (!assistant) {
        assistant = await this.prisma.aiAssistant.create({
          data: {
            tenantId,
            agentName: 'Default Assistant',
            modelProvider: 'openai',
            modelName: 'gpt-4o-mini',
            apiKeyMode: 'platform',
            routingMode: 'system_only',
          },
        });
      }

      await this.prisma.aiUsageLog.create({
        data: {
          tenantId,
          assistantId: assistant.id,
          tokensUsed: 150,
          costUsd: 0.0003,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error deducting AI credit for tenant ${tenantId}: ${err.message}`);
    }
  }

  /**
   * Per-commenter Anti-Abuse Rate Limit (Max 3 replies per user per hour per tenant)
   */
  private checkRateLimit(tenantId: string, userExternalId: string): boolean {
    const key = `${tenantId}:${userExternalId}`;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    let timestamps = this.rateLimitMap.get(key) || [];
    // Clean up timestamps older than 1 hour
    timestamps = timestamps.filter((t) => now - t < oneHour);

    if (timestamps.length >= 3) {
      return false; // Exceeded limit
    }

    timestamps.push(now);
    this.rateLimitMap.set(key, timestamps);
    return true;
  }

  private async saveLog(data: any): Promise<void> {
    try {
      await this.prisma.facebookCommentLog.create({
        data: {
          tenantId: data.tenantId,
          channelConnectionId: data.channelConnectionId || null,
          pageId: data.pageId,
          postId: data.postId,
          commentId: data.commentId,
          parentId: data.parentId || null,
          userExternalId: data.userExternalId,
          userName: data.userName || null,
          commentText: data.commentText,
          replyText: data.replyText || null,
          privateReplyText: data.privateReplyText || null,
          replyStatus: data.replyStatus || 'replied',
          skipReason: data.skipReason || null,
          aiCreditsUsed: data.aiCreditsUsed || 0,
        },
      });
    } catch (err: any) {
      this.logger.error(`Error saving FacebookCommentLog: ${err.message}`);
    }
  }

  /**
   * Settings API: Get comment automation settings for channel
   */
  async getCommentSettings(tenantId: string, channelId: string) {
    const channel = await this.prisma.channelConnection.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) {
      throw new NotFoundException('Channel connection not found');
    }

    return {
      channelId: channel.id,
      displayName: channel.displayName,
      pageId: channel.externalAccountId,
      isCommentAutoReplyEnabled: channel.isCommentAutoReplyEnabled,
      commentReplyMode: channel.commentReplyMode,
      commentKeywords: channel.commentKeywords || [],
      commentInstruction: channel.commentInstruction || '',
      excludedPostIds: channel.excludedPostIds || [],
      hasCommentPermissions: channel.hasCommentPermissions,
    };
  }

  /**
   * Settings API: Update comment automation settings for channel
   */
  async updateCommentSettings(tenantId: string, channelId: string, dto: UpdateCommentSettingsDto) {
    const channel = await this.prisma.channelConnection.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) {
      throw new NotFoundException('Channel connection not found');
    }

    const updated = await this.prisma.channelConnection.update({
      where: { id: channelId },
      data: {
        isCommentAutoReplyEnabled: dto.isCommentAutoReplyEnabled !== undefined ? dto.isCommentAutoReplyEnabled : undefined,
        commentReplyMode: dto.commentReplyMode !== undefined ? dto.commentReplyMode : undefined,
        commentKeywords: dto.commentKeywords !== undefined ? dto.commentKeywords : undefined,
        commentInstruction: dto.commentInstruction !== undefined ? dto.commentInstruction : undefined,
        excludedPostIds: dto.excludedPostIds !== undefined ? dto.excludedPostIds : undefined,
      },
    });

    return {
      success: true,
      channelId: updated.id,
      isCommentAutoReplyEnabled: updated.isCommentAutoReplyEnabled,
      commentReplyMode: updated.commentReplyMode,
      commentKeywords: updated.commentKeywords,
      commentInstruction: updated.commentInstruction,
      excludedPostIds: updated.excludedPostIds,
    };
  }

  /**
   * Log History API: Get comment logs for tenant
   */
  async getCommentLogs(tenantId: string, channelId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (channelId) where.channelConnectionId = channelId;

    const [items, total] = await Promise.all([
      this.prisma.facebookCommentLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.facebookCommentLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
