import { Test, TestingModule } from '@nestjs/testing';
import { UserPresenceService } from './user-presence.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserPresenceService', () => {
  let service: UserPresenceService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      userPresence: {
        upsert: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPresenceService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<UserPresenceService>(UserPresenceService);
  });

  it('should update presence status', async () => {
    prismaService.userPresence.upsert.mockResolvedValue({
      userId: 'user-1',
      status: 'busy',
      updatedAt: new Date(),
    });

    const result = await service.updatePresence('user-1', 'busy');
    expect(prismaService.userPresence.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { status: 'busy' },
      create: { userId: 'user-1', status: 'busy' },
    });
    expect(result.status).toBe('busy');
  });

  it('should fallback to available if invalid status provided', async () => {
    prismaService.userPresence.upsert.mockResolvedValue({
      userId: 'user-1',
      status: 'available',
      updatedAt: new Date(),
    });

    await service.updatePresence('user-1', 'invalid_status');
    expect(prismaService.userPresence.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { status: 'available' },
      create: { userId: 'user-1', status: 'available' },
    });
  });

  it('should return team presence for a tenant', async () => {
    prismaService.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Agent 1', role: 'agent', presence: { status: 'available' } },
      { id: 'u2', name: 'Agent 2', role: 'agent', presence: null },
    ]);

    const result = await service.getTeamPresence('tenant-1');
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('available');
    expect(result[1].status).toBe('offline');
  });
});
