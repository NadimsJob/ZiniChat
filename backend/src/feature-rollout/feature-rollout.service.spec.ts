import { Test, TestingModule } from '@nestjs/testing';
import { FeatureRolloutService } from './feature-rollout.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FeatureRolloutService', () => {
  let service: FeatureRolloutService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    featureRollout: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    featureRolloutTenant: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureRolloutService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FeatureRolloutService>(FeatureRolloutService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return false if rollout featureKey does not exist', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue(null);
    const result = await service.isFeatureEnabled('tenant-1', 'non_existent_key');
    expect(result).toBe(false);
  });

  it('should return true if rollout is global', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue({
      id: 'rollout-1',
      featureKey: 'test_key',
      isGlobal: true,
      tenants: []
    });
    const result = await service.isFeatureEnabled('tenant-1', 'test_key');
    expect(result).toBe(true);
  });

  it('should return true if tenant override is enabled', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue({
      id: 'rollout-1',
      featureKey: 'test_key',
      isGlobal: false,
      tenants: [{ isEnabled: true }]
    });
    const result = await service.isFeatureEnabled('tenant-1', 'test_key');
    expect(result).toBe(true);
  });

  it('should return false if tenant override is disabled, even if plan allows it (implicit in logic)', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue({
      id: 'rollout-1',
      featureKey: 'test_key',
      isGlobal: false,
      tenants: [{ isEnabled: false }]
    });
    const result = await service.isFeatureEnabled('tenant-1', 'test_key');
    expect(result).toBe(false);
    expect(mockPrismaService.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('should return true if plan includes feature', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue({
      id: 'rollout-1',
      featureKey: 'test_key',
      isGlobal: false,
      tenants: []
    });
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      plan: { features: ['test_key'] }
    });
    const result = await service.isFeatureEnabled('tenant-1', 'test_key');
    expect(result).toBe(true);
  });

  it('should return false if plan does not include feature and no global/tenant override', async () => {
    mockPrismaService.featureRollout.findUnique.mockResolvedValue({
      id: 'rollout-1',
      featureKey: 'test_key',
      isGlobal: false,
      tenants: []
    });
    mockPrismaService.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      plan: { features: ['other_key'] }
    });
    const result = await service.isFeatureEnabled('tenant-1', 'test_key');
    expect(result).toBe(false);
  });
});
