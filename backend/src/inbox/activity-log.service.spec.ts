import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      conversationActivity: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('record', () => {
    it('should create a conversation activity record', async () => {
      const activityData = {
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        contactId: 'contact-1',
        type: 'STARRED',
        actorUserId: 'user-1',
        metadataJson: { isStarred: true },
      };

      prismaService.conversationActivity.create.mockResolvedValue({
        id: 'act-1',
        ...activityData,
        createdAt: new Date(),
      });

      const result = await service.record(activityData);
      expect(prismaService.conversationActivity.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          contactId: 'contact-1',
          type: 'STARRED',
          actorUserId: 'user-1',
          metadataJson: { isStarred: true },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('act-1');
    });

    it('should handle errors gracefully without throwing', async () => {
      prismaService.conversationActivity.create.mockRejectedValue(new Error('DB Error'));

      const result = await service.record({
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        type: 'STARRED',
      });

      expect(result).toBeNull();
    });
  });

  describe('getActivityForConversation', () => {
    it('should return paginated activity records', async () => {
      const mockActivities = [
        { id: 'act-1', type: 'STARRED', createdAt: new Date() },
        { id: 'act-2', type: 'RESOLVED', createdAt: new Date() },
      ];

      prismaService.conversationActivity.findMany.mockResolvedValue(mockActivities);
      prismaService.conversationActivity.count.mockResolvedValue(2);

      const result = await service.getActivityForConversation('tenant-1', 'conv-1', 1, 10);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
    });
  });
});
