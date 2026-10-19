import { Test, TestingModule } from '@nestjs/testing';
import { MessengerService } from './messenger.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('MessengerService', () => {
  let service: MessengerService;
  let prisma: any;

  const mockPrisma = {
    channelConnection: {
      findFirst: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    facebookCommentLog: {
      findFirst: jest.fn(),
    },
    message: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessengerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MessengerService>(MessengerService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined and return channel type', () => {
    expect(service).toBeDefined();
    expect(service.getChannelType()).toBe('messenger');
  });

  describe('fetchSenderProfile', () => {
    it('should resolve full name from Meta direct PSID query without name field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          first_name: 'Nadim',
          last_name: 'Chowdhury',
          profile_pic: 'https://cdn.fb.com/nadim.jpg',
        }),
      });

      const res = await service.fetchSenderProfile('psid_123', 'messenger', {
        accessTokenEncrypted: 'mock_token',
        externalAccountId: 'page_456',
        tenantId: 'tenant_1',
      });

      expect(res).toEqual({
        name: 'Nadim Chowdhury',
        avatarUrl: 'https://cdn.fb.com/nadim.jpg',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=first_name,last_name,profile_pic'),
        expect.any(Object)
      );
    });

    it('should fallback to conversation thread t_<PSID> participants if direct query fails', async () => {
      // Direct query fails (e.g. 400 error due to missing app review permission)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Unsupported get request' } }),
      });

      // Thread query succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          participants: {
            data: [
              { id: 'page_456', name: 'Rakib Fashion' },
              { id: 'psid_123', name: 'Rakib Hasan' },
            ],
          },
        }),
      });

      const res = await service.fetchSenderProfile('psid_123', 'messenger', {
        accessTokenEncrypted: 'mock_token',
        externalAccountId: 'page_456',
        tenantId: 'tenant_1',
      });

      expect(res).toEqual({ name: 'Rakib Hasan' });
    });

    it('should fallback to facebookCommentLog if Meta APIs are unreachable', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      mockPrisma.facebookCommentLog.findFirst.mockResolvedValueOnce({
        userName: 'Customer From Comments',
      });

      const res = await service.fetchSenderProfile('psid_123', 'messenger', {
        accessTokenEncrypted: 'mock_token',
        externalAccountId: 'page_456',
        tenantId: 'tenant_1',
      });

      expect(res).toEqual({ name: 'Customer From Comments' });
    });
  });

  describe('parseWebhookPayload', () => {
    it('should parse incoming Messenger webhook and populate real sender name and connection ID', async () => {
      mockPrisma.channelConnection.findFirst.mockResolvedValue({
        id: 'conn_1',
        tenantId: 'tenant_1',
        channelType: 'messenger',
        externalAccountId: 'page_456',
        accessTokenEncrypted: 'mock_token',
      });

      // Mock direct profile lookup
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          first_name: 'Nadim',
          last_name: 'Chowdhury',
          profile_pic: 'https://cdn.fb.com/pic.jpg',
        }),
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page_456',
            messaging: [
              {
                sender: { id: 'psid_999' },
                recipient: { id: 'page_456' },
                timestamp: 1729350000000,
                message: {
                  mid: 'mid_123',
                  text: 'Hello, what is the price?',
                },
              },
            ],
          },
        ],
      };

      const messages = await service.parseWebhookPayload(payload);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        tenantId: 'tenant_1',
        channel: 'messenger',
        channelConnectionId: 'conn_1',
        externalContactId: 'psid_999',
        contactName: 'Nadim Chowdhury',
        avatarUrl: 'https://cdn.fb.com/pic.jpg',
      });
    });

    it('should skip echo messages and self-messages', async () => {
      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page_456',
            messaging: [
              {
                sender: { id: 'page_456' },
                recipient: { id: 'psid_999' },
                message: { mid: 'mid_echo', text: 'Auto reply', is_echo: true },
              },
            ],
          },
        ],
      };

      const messages = await service.parseWebhookPayload(payload);
      expect(messages).toHaveLength(0);
    });

    it('should resolve quoted message when user quotes a product via reply_to.mid', async () => {
      mockPrisma.channelConnection.findFirst.mockResolvedValue({
        id: 'conn_1',
        tenantId: 'tenant_1',
        accessTokenEncrypted: 'mock_token',
        externalAccountId: 'page_456',
      });
      mockPrisma.contact.findFirst.mockResolvedValue({
        name: 'Nadim Chowdhury',
      });
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 'db_mid_orig',
        externalMessageId: 'mid_quoted_456',
        content: JSON.stringify({
          body: '📸 Premium Panjabi — BDT 1,850',
          productId: 'prod_panjabi_1',
          productName: 'Premium Panjabi',
          productPrice: 1850,
        }),
      });

      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page_456',
            messaging: [
              {
                sender: { id: 'psid_999' },
                recipient: { id: 'page_456' },
                timestamp: 1729350000000,
                message: {
                  mid: 'mid_123',
                  text: 'এইটার দাম কত?',
                  reply_to: { mid: 'mid_quoted_456' },
                },
              },
            ],
          },
        ],
      };

      const messages = await service.parseWebhookPayload(payload);

      expect(messages).toHaveLength(1);
      expect(messages[0].content).toMatchObject({
        text: 'এইটার দাম কত?',
        quotedMsg: {
          id: 'mid_quoted_456',
          text: '📸 Premium Panjabi — BDT 1,850',
          productId: 'prod_panjabi_1',
          productName: 'Premium Panjabi',
          productPrice: 1850,
        },
      });
    });
  });
});
