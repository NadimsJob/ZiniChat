import { Test, TestingModule } from '@nestjs/testing';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';

describe('InboxController', () => {
  let controller: InboxController;

  const mockInboxService = {
    getActiveChannels: jest.fn(),
    getConversations: jest.fn(),
    getUnreadCount: jest.fn(),
    getMessages: jest.fn(),
    saveOutboundMessage: jest.fn(),
  };

  const mockInboxGateway = {
    broadcastToTenant: jest.fn(),
  };
  const mockQuotaService = {
    checkMessageQuota: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboxController],
      providers: [
        { provide: InboxService, useValue: mockInboxService },
        { provide: InboxGateway, useValue: mockInboxGateway },
        { provide: QuotaService, useValue: mockQuotaService },
      ],
    }).compile();

    controller = module.get<InboxController>(InboxController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send a message and check quota', async () => {
    const req = { user: { tenantId: 'tenant1' } };
    mockQuotaService.checkMessageQuota.mockResolvedValue(true);
    mockInboxService.saveOutboundMessage.mockResolvedValue({ message: {}, conversation: {} });
    
    await controller.sendMessage(req, { conversationId: 'conv-1', content: 'hello' });
    
    expect(mockQuotaService.checkMessageQuota).toHaveBeenCalledWith('tenant1');
    expect(mockInboxService.saveOutboundMessage).toHaveBeenCalledWith('tenant1', 'conv-1', 'hello');
  });
});
