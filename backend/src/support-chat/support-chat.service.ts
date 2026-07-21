import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import OpenAI from 'openai';

@Injectable()
export class SupportChatService {
  private readonly logger = new Logger(SupportChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) {}

  async getConversation(tenantId: string) {
    let conversation = await this.prisma.supportConversation.findFirst({
      where: { tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    if (!conversation) {
      conversation = await this.prisma.supportConversation.create({
        data: { tenantId },
        include: { messages: true }
      });
    }

    return conversation;
  }

  async sendMessage(tenantId: string, message: string) {
    const conversation = await this.getConversation(tenantId);

    // Save user message
    await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: 'user',
        message: message
      }
    });

    // Fetch conversation history
    const history = await this.prisma.supportMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' }
    });

    // Determine which AiConfig to use for Support AI
    let aiConfig = await this.prisma.aiConfig.findFirst({
      where: { isSupportDefault: true }
    });

    if (!aiConfig) {
      // Fallback to general active config
      aiConfig = await this.prisma.aiConfig.findFirst({
        where: { isActive: true }
      });
    }

    if (!aiConfig) {
      // Create a fallback message
      const fallbackMsg = "AI configuration is not set up. Please contact support via phone.";
      await this.prisma.supportMessage.create({
        data: { conversationId: conversation.id, senderType: 'ai', message: fallbackMsg }
      });
      return { success: true, message: fallbackMsg };
    }

    // Build Messages for AI
    const systemPrompt = `You are the internal ZiniChat Platform Support Agent. 
Your job is to help the tenant (user) set up their account, answer platform-related questions, and assist them. 
DO NOT answer questions unrelated to ZiniChat or general AI queries. 
If the user asks for a human, or you cannot solve their issue, you MUST ask for their phone number and issue summary. Once provided, call the 'create_support_ticket' function.
Always communicate in Bengali unless the user speaks in English. Be polite and concise.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({
        role: msg.senderType === 'user' ? 'user' : 'assistant',
        content: msg.message
      }))
    ];

    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_support_ticket',
          description: 'Creates a support ticket for the user when they need human assistance or the issue cannot be resolved by the AI.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string', description: 'The phone number of the user' },
              issue_summary: { type: 'string', description: 'A short summary of the issue' }
            },
            required: ['phone', 'issue_summary']
          }
        }
      }
    ];

    try {
      const openai = new OpenAI({
        apiKey: aiConfig.apiKey,
        baseURL: aiConfig.apiEndpoint || undefined
      });

      const response = await openai.chat.completions.create({
        model: aiConfig.modelName,
        messages: messages as any,
        tools: tools as any,
        tool_choice: 'auto',
      });

      const responseMessage = response.choices[0].message;

      if (responseMessage.tool_calls) {
        // Handle tool call
        const toolCall = responseMessage.tool_calls[0];
        if (toolCall.function.name === 'create_support_ticket') {
          const args = JSON.parse(toolCall.function.arguments);
          
          // Create ticket
          await this.prisma.ticket.create({
            data: {
              tenantId,
              subject: `AI Escalated: ${args.issue_summary}`,
              type: 'Technical Support',
              status: 'open',
              priority: 'medium',
              messages: {
                create: {
                  senderType: 'tenant',
                  senderId: (await this.prisma.user.findFirst({ where: { tenantId } })).id, // Fallback to first user of tenant
                  message: `Phone: ${args.phone}\nIssue: ${args.issue_summary}`
                }
              }
            }
          });

          const confirmationMsg = "আপনার জন্য একটি সাপোর্ট টিকিট ওপেন করা হয়েছে। আমাদের টিম খুব শীঘ্রই আপনার সাথে যোগাযোগ করবে।";
          await this.prisma.supportMessage.create({
            data: { conversationId: conversation.id, senderType: 'ai', message: confirmationMsg }
          });

          return { success: true, message: confirmationMsg };
        }
      } else {
        const aiResponse = responseMessage.content || '';
        await this.prisma.supportMessage.create({
          data: { conversationId: conversation.id, senderType: 'ai', message: aiResponse }
        });
        return { success: true, message: aiResponse };
      }

    } catch (error) {
      this.logger.error(`Error in Support AI: ${error.message}`);
      const errorMsg = "দুঃখিত, এই মুহূর্তে একটি সমস্যা হচ্ছে। দয়া করে পরে আবার চেষ্টা করুন।";
      await this.prisma.supportMessage.create({
        data: { conversationId: conversation.id, senderType: 'ai', message: errorMsg }
      });
      return { success: true, message: errorMsg };
    }
  }

  async getConversationsForSuperadmin() {
    return this.prisma.supportConversation.findMany({
      include: {
        tenant: {
          select: { id: true, businessName: true, email: true, phone: true }
        },
        _count: { select: { messages: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async getConversationMessagesForSuperadmin(tenantId: string) {
    return this.prisma.supportConversation.findFirst({
      where: { tenantId },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }
}
