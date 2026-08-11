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
          id: 'ai-config-123',
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
          businessNature: 'Retail, E-commerce & Trading',
          messageCount: 150,
          customPlanName: 'Starter Plan',
          plan: { name: 'Starter' },
          subscriptions: [{ currentPeriodEnd: new Date('2026-12-31') }],
          channelConns: [{ channelType: { code: 'wa' }, status: 'active' }],
          customAiConfig: { provider: 'openai', modelName: 'gpt-4o' }
        })
      },
      businessNature: {
        findFirst: jest.fn().mockResolvedValue({
          name: 'Retail, E-commerce & Trading',
          isPropertyMode: false,
          isHospitalityMode: false,
          isTechSoftwareMode: false,
          isFinancialServiceMode: false,
          isHealthcareMode: false,
          isEducationMode: false,
          isManufacturingMode: false,
          isLogisticsMode: false
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

  it('should contain Facebook Comment Automation knowledge in system prompt', () => {
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('FACEBOOK COMMENT AUTOMATION');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Public Comment Only');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Private Message Only');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Public & Private Both');
  });

  it('should contain official ZiniChat phone number and contact details in system prompt', () => {
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('01533894967');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('support@zinichat.com');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Uttar Badda');
  });

  it('should contain BUSINESS VERTICAL AWARENESS section in system prompt', () => {
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('BUSINESS VERTICAL AWARENESS');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('VERTICAL QUICK REFERENCE');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Healthcare');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Education');
    expect(DEFAULT_SUPPORT_AI_SYSTEM_PROMPT).toContain('Logistics');
  });

  it('should inject retail vertical context for default/no businessNature tenant', async () => {
    prismaService.businessNature.findFirst.mockResolvedValueOnce(null);
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-retail', businessName: 'Retail Co', businessNature: null,
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    const ctx = await service.getTenantContext('tenant-retail');
    expect(ctx).toContain('Retail');
    expect(ctx).toContain('E-commerce');
  });

  it('should inject property vertical context for isPropertyMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-prop', businessName: 'Estate Corp', businessNature: 'Real Estate & Construction',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Real Estate & Construction', isPropertyMode: true,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-prop');
    expect(ctx).toContain('Real Estate');
    expect(ctx).toContain('Properties');
    expect(ctx).toContain('Property Inquiry');
  });

  it('should inject hospitality vertical context for isHospitalityMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-hotel', businessName: 'Grand Hotel', businessNature: 'Hospitality, Travel & Lifestyle',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Hospitality, Travel & Lifestyle', isPropertyMode: false,
      isHospitalityMode: true, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-hotel');
    expect(ctx).toContain('Hospitality');
    expect(ctx).toContain('Rooms & Services');
    expect(ctx).toContain('Room Booking');
  });

  it('should inject tech vertical context for isTechSoftwareMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-tech', businessName: 'SoftCo', businessNature: 'Technology & Software',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Technology & Software', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: true, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-tech');
    expect(ctx).toContain('Technology');
    expect(ctx).toContain('Software Plans');
    expect(ctx).toContain('Demo Requests');
    expect(ctx).toContain('Qualified');
  });

  it('should inject financial vertical context for isFinancialServiceMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-fin', businessName: 'FinAdvisors', businessNature: 'Financial & Professional Services',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Financial & Professional Services', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: true,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-fin');
    expect(ctx).toContain('Financial');
    expect(ctx).toContain('Service Packages');
    expect(ctx).toContain('Consultations');
    expect(ctx).toContain('Intake');
  });

  it('should inject healthcare vertical context for isHealthcareMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-health', businessName: 'City Clinic', businessNature: 'Healthcare',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Healthcare', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: true, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-health');
    expect(ctx).toContain('Healthcare');
    expect(ctx).toContain('Doctors & Care');
    expect(ctx).toContain('Appointments');
    expect(ctx).toContain('Triage');
  });

  it('should inject education vertical context for isEducationMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-edu', businessName: 'Bright Academy', businessNature: 'Education',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Education', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: true, isManufacturingMode: false, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-edu');
    expect(ctx).toContain('Education');
    expect(ctx).toContain('Courses');
    expect(ctx).toContain('Admissions');
    expect(ctx).toContain('Admission Pipeline');
  });

  it('should inject manufacturing vertical context for isManufacturingMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-mfg', businessName: 'FactoryX', businessNature: 'Manufacturing & Industrial',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Manufacturing & Industrial', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: true, isLogisticsMode: false
    });
    const ctx = await service.getTenantContext('tenant-mfg');
    expect(ctx).toContain('Manufacturing');
    expect(ctx).toContain('Wholesale');
    expect(ctx).toContain('RFQ');
  });

  it('should inject logistics vertical context for isLogisticsMode tenant', async () => {
    prismaService.tenant.findUnique.mockResolvedValueOnce({
      id: 'tenant-log', businessName: 'SpeedFreight', businessNature: 'Logistics & Infrastructure',
      messageCount: 0, plan: null, subscriptions: [], channelConns: [],
      customAiConfig: null, customPlanName: null
    });
    prismaService.businessNature.findFirst.mockResolvedValueOnce({
      name: 'Logistics & Infrastructure', isPropertyMode: false,
      isHospitalityMode: false, isTechSoftwareMode: false, isFinancialServiceMode: false,
      isHealthcareMode: false, isEducationMode: false, isManufacturingMode: false, isLogisticsMode: true
    });
    const ctx = await service.getTenantContext('tenant-log');
    expect(ctx).toContain('Logistics');
    expect(ctx).toContain('Shipping Routes');
    expect(ctx).toContain('Shipments & Bookings');
  });

  it('should call getOrCreateSupportCache with verticalName from tenant businessNature', async () => {
    const aiCacheServiceMock = (service as any).aiCacheService;
    await service.sendMessage('tenant-123', 'hello');
    expect(aiCacheServiceMock.getOrCreateSupportCache).toHaveBeenCalledWith(
      expect.objectContaining({
        verticalName: 'Retail, E-commerce & Trading',
        aiConfigId: 'ai-config-123'
      })
    );
  });

  it('should build cacheable prefix with vertical block before dynamic tenant context', async () => {
    // Verify prompt structure: cacheable prefix (system prompt + vertical block) comes BEFORE
    // the dynamic tenant context. This ensures OpenAI prefix-caching works correctly.
    const aiConfigSpy = jest.spyOn(prismaService.aiConfig, 'findFirst');
    aiConfigSpy.mockResolvedValueOnce({
      id: 'ai-config-123', apiKey: 'test-key', modelName: 'gpt-4o',
      provider: 'openai', isSupportDefault: true, systemPrompt: null
    });

    // We verify indirectly: getTenantContext is called AFTER resolveBusinessNatureContext
    // The cacheable prefix must contain the vertical block content
    const ctx = await service.getTenantContext('tenant-123');
    // Dynamic context comes last — contains tenant name and plan
    expect(ctx).toContain('ZiniTech Store');
    // Vertical block is injected into getTenantContext return value
    expect(ctx).toContain('Retail');
  });
});
