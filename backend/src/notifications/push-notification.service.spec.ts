import { Test, TestingModule } from '@nestjs/testing';
import { PushNotificationService } from './push-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue({}),
}));

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let prisma: any;

  const mockPrisma = {
    userPushSubscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PushNotificationService>(PushNotificationService);
    prisma = module.get<PrismaService>(PrismaService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return public key', () => {
    const key = service.getPublicKey();
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
  });

  it('should subscribe a user endpoint', async () => {
    mockPrisma.userPushSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.userPushSubscription.create.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example.com',
    });

    const result = await service.subscribe('user-1', {
      endpoint: 'https://push.example.com',
      keys: { p256dh: 'p256key', auth: 'authkey' },
    });

    expect(result).toBeDefined();
    expect(mockPrisma.userPushSubscription.create).toHaveBeenCalled();
  });

  it('should send push notification with sound and vibration payload', async () => {
    mockPrisma.userPushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com',
        p256dh: 'p256',
        auth: 'auth',
      },
    ]);

    await service.sendPushToUser('user-1', 'New Message', 'Hello customer');

    expect(webpush.sendNotification).toHaveBeenCalled();
    const callArgs = (webpush.sendNotification as jest.Mock).mock.calls[0];
    const payload = JSON.parse(callArgs[1]);

    expect(payload.notification.title).toBe('New Message');
    expect(payload.notification.sound).toBe('/sounds/notification.mp3');
    expect(payload.notification.silent).toBe(false);
    expect(payload.notification.vibrate).toEqual([200, 100, 200]);
  });
});
