import { Test, TestingModule } from '@nestjs/testing';
import { InboxController } from './inbox.controller';
import { InboxService } from './inbox.service';
import { InboxGateway } from './inbox.gateway';
import { QuotaService } from '../tenants/quota.service';
import { ActivityLogService } from './activity-log.service';
import { UserPresenceService } from './user-presence.service';
import { StorageService } from '../storage/storage.service';
import { FeatureGuard } from '../auth/guards/feature.guard';

describe('InboxController', () => {
  let controller: InboxController;

  const mockInboxService = {
    getActiveChannels: jest.fn(),
    getConversations: jest.fn(),
    getUnreadCount: jest.fn(),
    getMessages: jest.fn(),
    saveOutboundMessage: jest.fn(),
    getInboxCounts: jest.fn(),
  };

  const mockInboxGateway = {
    broadcastToTenant: jest.fn(),
  };
  const mockQuotaService = {
    checkMessageQuota: jest.fn(),
    checkStorageQuota: jest.fn(),
    incrementStorage: jest.fn(),
  };
  const mockActivityLogService = {
    record: jest.fn(),
    getActivityForConversation: jest.fn(),
  };
  const mockUserPresenceService = {
    updatePresence: jest.fn(),
    getTeamPresence: jest.fn(),
  };
  const mockStorageService = {
    uploadChatMedia: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InboxController],
      providers: [
        { provide: InboxService, useValue: mockInboxService },
        { provide: InboxGateway, useValue: mockInboxGateway },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: UserPresenceService, useValue: mockUserPresenceService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    })
      .overrideGuard(FeatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InboxController>(InboxController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should send a message and check quota', async () => {
    const req = { user: { tenantId: 'tenant1', userId: 'user1' } };
    mockInboxService.saveOutboundMessage.mockResolvedValue({
      message: { id: 'msg1', content: 'hello' },
      conversation: { id: 'conv1' }
    });

    const result = await controller.sendMessage(req, { conversationId: 'conv1', content: 'hello' });

    expect(mockQuotaService.checkMessageQuota).toHaveBeenCalledWith('tenant1');
    expect(mockInboxService.saveOutboundMessage).toHaveBeenCalledWith('tenant1', 'conv1', 'hello', 'text', 'user1');
    expect(mockInboxGateway.broadcastToTenant).toHaveBeenCalledWith('tenant1', 'new_message', expect.any(Object));
    expect(result).toBeDefined();
  });

  it('should send media message through StorageService with progressive JPEG compression', async () => {
    const req = { user: { tenantId: 'tenant1', userId: 'user1' } };
    const mockFile: any = {
      originalname: 'screenshot.png',
      mimetype: 'image/png',
      size: 500000,
      buffer: Buffer.from('mock-image-data'),
    };

    mockStorageService.uploadChatMedia.mockResolvedValue({
      publicUrl: '/uploads/tenants/tenant1/chat_123.jpg',
      diskPath: '/usr/src/app/uploads/tenants/tenant1/chat_123.jpg',
      fileName: 'chat_123.jpg',
      sizeBytes: 85000,
      mimeType: 'image/jpeg',
    });

    mockInboxService.saveOutboundMessage.mockResolvedValue({
      message: { id: 'msg2', type: 'image', content: { mediaUrl: '/uploads/tenants/tenant1/chat_123.jpg' } },
      conversation: { id: 'conv1' }
    });

    const result = await controller.sendMediaMessage(req, { conversationId: 'conv1', content: 'Here is the receipt' }, mockFile);

    expect(mockQuotaService.checkMessageQuota).toHaveBeenCalledWith('tenant1');
    expect(mockStorageService.uploadChatMedia).toHaveBeenCalledWith(mockFile, 'tenant1');
    expect(mockInboxService.saveOutboundMessage).toHaveBeenCalledWith(
      'tenant1',
      'conv1',
      {
        body: 'Here is the receipt',
        mediaUrl: '/uploads/tenants/tenant1/chat_123.jpg',
        fileName: 'chat_123.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 85000,
      },
      'image',
      'user1'
    );
    expect(mockInboxGateway.broadcastToTenant).toHaveBeenCalledWith('tenant1', 'new_message', expect.any(Object));
    expect(result).toBeDefined();
  });
});
