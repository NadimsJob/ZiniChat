import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatService, DEFAULT_SUPPORT_AI_SYSTEM_PROMPT } from './support-chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SmtpService } from '../smtp/smtp.service';
import { AiCacheService } from '../ai/ai-cache.service';

// Mock OpenAI SDK
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (params: any) => {
          const userMsgs = params.messages.filter((m: any) => m.role === 'user');
          const lastUserMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';

          if (lastUserMsg.includes('ticket issue')) {
            return {
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'create_detailed_support_ticket',
                          arguments: JSON.stringify({
                            phone: '01700000000',
                            issue_summary: 'Unable to connect WhatsApp channel',
                            category: 'Integration',
                            priority: 'high'
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            };
          } else if (lastUserMsg.includes('permission')) {
            return {
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'request_tenant_permission',
                          arguments: JSON.stringify({
                            action_type: 'update_ai_prompt',
                            description: 'আপনার সিস্টেম প্রম্পট আপডেট করা হবে'
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            };
          } else if (lastUserMsg.includes('navigate')) {
            return {
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'navigate_to_page',
                          arguments: JSON.stringify({
                            page_name: 'AI Training',
                            path: '/dashboard/settings/ai-training',
                            navigation_steps: 'Settings -> AI Training'
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            };
          } else if (lastUserMsg.includes('analytics')) {
            return {
              choices: [
                {
                  message: {
                    tool_calls: [
                      {
                        function: {
                          name: 'redirect_to_dashboard_analytics',
                          arguments: JSON.stringify({
                            dashboard_path: '/dashboard',
                            reason: 'Visual analytics available on dashboard'
                          })
                        }
                      }
                    ]
                  }
                }
              ]
            };
          }

          return {
            choices: [
              {
                message: {
                  content: 'স্বাগতম! আমি কীভাবে আপনাকে সাহায্য করতে পারি?'
                }
              }
            ]
          };
        })
      }
    }
  }));
});

describe('SupportChatService', () => {
  let service: SupportChatService;
  let prismaService: any;
  let notificationsService: any;
  let smtpService: any;
  let mockMessages: any[];

  beforeEach(async () => {
    mockMessages = [];

    prismaService = {
      supportConversation: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.status === 'active') {
            return Promise.resolve({
              id: 'conv-123',
              tenantId: 'tenant-123',
              status: 'active',
              updatedAt: new Date(),
              messages: []
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockResolvedValue({
          id: 'conv-new-123',
          tenantId: 'tenant-123',
          status: 'active',
          messages: []
        }),
        update: jest.fn().mockResolvedValue({
          id: 'conv-123',
          status: 'closed',
          closedAt: new Date()
        }),
        findMany: jest.fn().mockResolvedValue([
          { id: 'conv-123', tenantId: 'tenant-123', status: 'closed' }
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-123',
          tenantId: 'tenant-123',
          messages: []
        })
      },
      supportMessage: {
        create: jest.fn().mockImplementation(({ data }) => {
          const msgObj = { id: `msg-${mockMessages.length + 1}`, ...data };
          mockMessages.push(msgObj);
          return Promise.resolve(msgObj);
        }),
        findMany: jest.fn().mockImplementation(() => Promise.resolve(mockMessages))
      },
      aiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          apiKey: 'test-key',
          modelName: 'gpt-4o',
          provider: 'openai',
          isSupportDefault: true
        })
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'tenant-123',
          businessName: 'ZiniTech Store',
          messageCount: 150,
          customPlanName: 'Starter Plan',
          plan: { name: 'Starter' },
          subscriptions: [{ currentPeriodEnd: new Date('2026-12-31') }],
          channelConns: [{ channelType: { code: 'wa' }, status: 'active' }],
          customAiConfig: { provider: 'openai', modelName: 'gpt-4o' }
        })
      },
      ticket: {
        create: jest.fn().mockResolvedValue({
          id: 'ticket-123',
          tenant: { businessName: 'ZiniTech Store' }
        })
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'user-123' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'user-123', email: 'owner@zinitech.com', role: 'owner' }])
      },
      plan: {
        findMany: jest.fn().mockResolvedValue([
          { name: 'Starter', priceMonthlyBdt: 499, whatsappLimit: 1, messengerLimit: 1, instagramLimit: 0, messageQuota: 1000, aiQuota: 500, seatLimit: 2 },
          { name: 'Growth', priceMonthlyBdt: 999, whatsappLimit: 3, messengerLimit: 3, instagramLimit: 3, messageQuota: 5000, aiQuota: 2000, seatLimit: 5 }
        ])
      }
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue(true),
      createSystemNotificationForSuperadmins: jest.fn().mockResolvedValue(true)
    };

    smtpService = {
      triggerTicketCreatedEmail: jest.fn().mockResolvedValue(true)
    };

    const aiCacheService = {
      getOrCreateSupportCache: jest.fn().mockResolvedValue({ isCached: false, cacheKey: null }),
      invalidateSupportCache: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AiService, useValue: {} },
        { provide: AiCacheService, useValue: aiCacheService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: SmtpService, useValue: smtpService }
      ]
    }).compile();

    service = module.get<SupportChatService>(SupportChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return active conversation or spawn new one on timeout', async () => {
    const conv = await service.getConversation('tenant-123');
    expect(conv).toBeDefined();
    expect(conv.id).toBe('conv-123');
    expect(prismaService.supportConversation.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-123', status: 'active' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  });

  it('should auto-close session when inactivity timeout exceeds 30 minutes', async () => {
    const oldDate = new Date(Date.now() - 40 * 60 * 1000); // 40 mins ago
    prismaService.supportConversation.findFirst.mockResolvedValueOnce({
      id: 'conv-old',
      tenantId: 'tenant-123',
      status: 'active',
      updatedAt: oldDate,
      messages: []
    });

    const conv = await service.getConversation('tenant-123');
    expect(prismaService.supportConversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-old' },
      data: { status: 'closed', closedAt: expect.any(Date) }
    });
    expect(conv.id).toBe('conv-new-123');
  });

  it('should manually close an active support session', async () => {
    const result = await service.closeSession('tenant-123');
    expect(result.success).toBe(true);
    expect(prismaService.supportConversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-123' },
      data: { status: 'closed', closedAt: expect.any(Date) }
    });
  });

  it('should assemble dynamic tenant context correctly', async () => {
    const contextStr = await service.getTenantContext('tenant-123');
    expect(contextStr).toContain('ZiniTech Store');
    expect(contextStr).toContain('Starter Plan');
    expect(contextStr).toContain('WA (active)');
  });

  it('should handle sendMessage with ticket creation tool call', async () => {
    const res = await service.sendMessage('tenant-123', 'Please create a ticket issue for WhatsApp');
    expect(res.success).toBe(true);
    expect(res.message).toContain('সাপোর্ট টিকিট');
    expect(prismaService.ticket.create).toHaveBeenCalled();
    expect(notificationsService.createSystemNotificationForSuperadmins).toHaveBeenCalled();
  });

  it('should handle sendMessage with permission request tool call', async () => {
    const res = await service.sendMessage('tenant-123', 'I need permission to update prompt');
    expect(res.success).toBe(true);
    expect(res.message).toContain('ACTION_PERMISSION_REQUEST');
  });

  it('should handle sendMessage with navigation tool call', async () => {
    const res = await service.sendMessage('tenant-123', 'navigate to AI training');
    expect(res.success).toBe(true);
    expect(res.message).toContain('/dashboard/settings/ai-training');
  });

  it('should handle sendMessage with dashboard analytics redirection tool call', async () => {
    const res = await service.sendMessage('tenant-123', 'show me monthly analytics');
    expect(res.success).toBe(true);
    expect(res.message).toContain('/dashboard');
  });

  it('should return conversations history for superadmin', async () => {
    const list = await service.getConversationsForSuperadmin();
    expect(list.length).toBe(1);
    expect(prismaService.supportConversation.findMany).toHaveBeenCalled();
  });
});
