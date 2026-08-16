import { Test, TestingModule } from '@nestjs/testing';
import { FacebookCommentsService } from './facebook-comments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QuotaService } from '../../tenants/quota.service';
import { AiService } from '../../ai/ai.service';
import { InboxService } from '../../inbox/inbox.service';
import { InboxGateway } from '../../inbox/inbox.gateway';

describe('FacebookCommentsService', () => {
  let service: FacebookCommentsService;
  let prisma: PrismaService;
  let quotaService: QuotaService;

  const mockPrismaService = {
    channelConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    facebookCommentLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    aiAssistant: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    qnAKnowledgeBase: {
      findMany: jest.fn(),
    },
    aiConfig: {
      findFirst: jest.fn(),
    },
    aiUsageLog: {
      create: jest.fn(),
    },
  };

  const mockQuotaService = {
    checkAiQuota: jest.fn(),
    checkFeature: jest.fn().mockResolvedValue(true),
  };

  const mockAiService = {
    getConfigs: jest.fn(),
    generateCompletion: jest.fn().mockResolvedValue('Mock AI comment response'),
  };

  const mockInboxService = {
    handleIncomingMessage: jest.fn(),
  };

  const mockInboxGateway = {
    broadcastToTenant: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacebookCommentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: AiService, useValue: mockAiService },
        { provide: InboxService, useValue: mockInboxService },
        { provide: InboxGateway, useValue: mockInboxGateway },
      ],
    }).compile();

    service = module.get<FacebookCommentsService>(FacebookCommentsService);
    prisma = module.get<PrismaService>(PrismaService);
    quotaService = module.get<QuotaService>(QuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should ignore self-comments', async () => {
    const pageId = 'page_123';
    const change = {
      value: {
        verb: 'add',
        item: 'comment',
        comment_id: 'c_1',
        from: { id: pageId, name: 'My Page' },
        message: 'Self reply',
      },
    };

    await service.processFeedChange(pageId, change);
    expect(mockPrismaService.channelConnection.findFirst).not.toHaveBeenCalled();
  });

  it('should return comment settings for tenant', async () => {
    mockPrismaService.channelConnection.findFirst.mockResolvedValue({
      id: 'channel_1',
      tenantId: 'tenant_1',
      displayName: 'Test Page',
      externalAccountId: 'page_123',
      isCommentAutoReplyEnabled: true,
      commentReplyMode: 'public',
      commentKeywords: ['price'],
      commentInstruction: 'Be polite',
      excludedPostIds: [],
      hasCommentPermissions: true,
    });

    const res = await service.getCommentSettings('tenant_1', 'channel_1');
    expect(res).toEqual({
      channelId: 'channel_1',
      displayName: 'Test Page',
      pageId: 'page_123',
      isCommentAutoReplyEnabled: true,
      commentReplyMode: 'public',
      commentKeywords: ['price'],
      commentInstruction: 'Be polite',
      excludedPostIds: [],
      hasCommentPermissions: true,
    });
  });
});
