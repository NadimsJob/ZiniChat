import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpProcessor } from './follow-up.processor';
import { PrismaService } from '../prisma/prisma.service';
import { InboxService } from '../inbox/inbox.service';
import { QuotaService } from '../tenants/quota.service';
import { Job } from 'bullmq';

describe('FollowUpProcessor', () => {
  let processor: FollowUpProcessor;
  let prismaService: any;
  let inboxService: any;
  let quotaService: any;

  beforeEach(async () => {
    prismaService = {
      contact: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
      },
      aiAssistant: {
        findFirst: jest.fn(),
      },
    };

    inboxService = {
      saveOutboundMessage: jest.fn(),
    };

    quotaService = {
      checkMessageQuota: jest.fn().mockResolvedValue(true),
      checkAiQuota: jest.fn().mockResolvedValue(true),
      reserveAiResponseUnits: jest.fn().mockResolvedValue('log123'),
      commitReservedUnits: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpProcessor,
        { provide: PrismaService, useValue: prismaService },
        { provide: InboxService, useValue: inboxService },
        { provide: QuotaService, useValue: quotaService },
      ],
    }).compile();

    processor = module.get<FollowUpProcessor>(FollowUpProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process automated follow-up correctly when valid contact and open conversation exist', async () => {
    prismaService.contact.findUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      automatedFollowUpMessage: 'Please check your order',
      automatedFollowUpSent: false,
    });
    prismaService.tenant.findUnique.mockResolvedValue({ id: 't1', status: 'active' });
    prismaService.conversation.findFirst.mockResolvedValue({ id: 'conv1', status: 'open' });
    prismaService.aiAssistant.findFirst.mockResolvedValue({ id: 'ai1' });
    prismaService.contact.update.mockResolvedValue({});

    const mockJob = { data: { contactId: 'c1' } } as Job<{ contactId: string }>;

    await processor.process(mockJob);

    expect(quotaService.checkMessageQuota).toHaveBeenCalledWith('t1');
    expect(quotaService.checkAiQuota).toHaveBeenCalledWith('t1');
    expect(quotaService.reserveAiResponseUnits).toHaveBeenCalledWith('t1', 1, 'Automated Follow-up', 'c1');
    expect(quotaService.commitReservedUnits).toHaveBeenCalledWith('log123');
    expect(inboxService.saveOutboundMessage).toHaveBeenCalledWith(
      't1',
      'conv1',
      'Please check your order',
      'text',
      'ai1'
    );
    expect(prismaService.contact.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { automatedFollowUpSent: true },
    });
  });

  it('should skip if contact already sent automated follow up', async () => {
    prismaService.contact.findUnique.mockResolvedValue({
      id: 'c1',
      tenantId: 't1',
      automatedFollowUpMessage: 'Message',
      automatedFollowUpSent: true,
    });

    const mockJob = { data: { contactId: 'c1' } } as Job<{ contactId: string }>;
    await processor.process(mockJob);

    expect(inboxService.saveOutboundMessage).not.toHaveBeenCalled();
  });
});
