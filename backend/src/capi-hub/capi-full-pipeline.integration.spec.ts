import { Test, TestingModule } from '@nestjs/testing';
import { CapiHubService } from './capi-hub.service';
import { CapiHubController } from './capi-hub.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { FeatureRolloutService } from '../feature-rollout/feature-rollout.service';
import { getQueueToken } from '@nestjs/bullmq';
import { UnauthorizedException } from '@nestjs/common';
import { metaMockServer } from '../test/mocks/meta-graph-api.mock';
import * as bcrypt from 'bcrypt';

const TENANT_ID = 'tenant-capi-e2e-1';

describe('CAPI Full Pipeline E2E Integration Suite', () => {
  let service: CapiHubService;
  let controller: CapiHubController;
  let prismaMock: any;
  let capiQueueMock: any;
  let eventLogs: any[] = [];

  beforeAll(() => {
    metaMockServer.listen();
  });

  afterAll(() => {
    metaMockServer.close();
  });

  beforeEach(async () => {
    metaMockServer.reset();
    eventLogs = [];

    prismaMock = {
      tenantCapiIntegration: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.tenantId === TENANT_ID || where?.webhookToken === 'valid-webhook-token') {
            const hashedSecret = await bcrypt.hash('secret-123', 10);
            return {
              id: 'int-e2e-1',
              tenantId: TENANT_ID,
              pixelId: '1234567890',
              accessToken: 'encrypted-token-xyz',
              isActive: true,
              webhookToken: 'valid-webhook-token',
              webhookSecret: hashedSecret,
            };
          }
          return null;
        }),
      },
      tenantCapiEventConfig: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          return {
            id: 'config-1',
            tenantId: TENANT_ID,
            eventName: where.tenantId_eventName?.eventName || 'Purchase',
            isEnabled: true,
            sourceInboxAiIntent: true,
          };
        }),
      },
      capiEventLog: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const log = { id: `log-${eventLogs.length + 1}`, createdAt: new Date(), ...data };
          eventLogs.push(log);
          return log;
        }),
        findMany: jest.fn().mockImplementation(async () => eventLogs),
      },
    };

    capiQueueMock = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapiHubController],
      providers: [
        CapiHubService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: CryptoService,
          useValue: {
            encrypt: (val: string) => `encrypted-${val}`,
            decrypt: (val: string) => 'decrypted-token-xyz',
          },
        },
        {
          provide: FeatureRolloutService,
          useValue: { isFeatureEnabled: jest.fn().mockResolvedValue(true) },
        },
        { provide: getQueueToken('capi-events'), useValue: capiQueueMock },
      ],
    }).compile();

    service = module.get<CapiHubService>(CapiHubService);
    controller = module.get<CapiHubController>(CapiHubController);
  });

  it('Order intent in inbox → Purchase event fires → CapiEventLog created', async () => {
    const payload = {
      event_name: 'Purchase',
      event_id: 'order_tx_1001',
      user_data: { em: ['test@domain.com'], ph: ['8801700000000'] },
      custom_data: { currency: 'BDT', value: 1500 },
    };

    await service.fireEvent(TENANT_ID, 'Purchase', payload, 'inbox');

    expect(prismaMock.capiEventLog.create).toHaveBeenCalled();
    const createdLog = eventLogs[0];
    expect(createdLog).toBeDefined();
    expect(createdLog.eventName).toBe('Purchase');
    expect(createdLog.status).toBe('pending');
    expect(capiQueueMock.add).toHaveBeenCalledWith(
      'send-capi-event',
      expect.objectContaining({
        logId: expect.any(String),
        tenantId: TENANT_ID,
      }),
      expect.any(Object)
    );
  });

  it('Duplicate event_id within 24h → logged with unique eventId and enqueued', async () => {
    const payload = {
      event_name: 'Purchase',
      event_id: 'dup_order_999',
      user_data: { em: ['buyer@domain.com'] },
    };

    // First fire
    await service.fireEvent(TENANT_ID, 'Purchase', payload, 'inbox');
    expect(eventLogs.length).toBe(1);
    expect(eventLogs[0].status).toBe('pending');

    // Duplicate fire with same event_id
    await service.fireEvent(TENANT_ID, 'Purchase', payload, 'inbox');

    expect(eventLogs.length).toBe(2);
    expect(capiQueueMock.add).toHaveBeenCalledTimes(2);
  });

  it('External webhook → valid secret → event fires', async () => {
    const webhookPayload = {
      event_name: 'Lead',
      event_id: 'webhook_lead_555',
      user_data: { em: ['lead@external.com'] },
    };

    const res = await controller.handleWebhook('valid-webhook-token', 'secret-123', webhookPayload);

    expect(res).toEqual({ success: true });
    expect(prismaMock.capiEventLog.create).toHaveBeenCalled();
    expect(eventLogs.some((l) => l.eventName === 'Lead')).toBe(true);
  });

  it('External webhook → invalid secret → throws UnauthorizedException', async () => {
    const webhookPayload = { event_name: 'Lead' };

    await expect(
      controller.handleWebhook('valid-webhook-token', 'wrong-secret', webhookPayload)
    ).rejects.toThrow(UnauthorizedException);
  });
});
