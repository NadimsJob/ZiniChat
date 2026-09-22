import { Test, TestingModule } from '@nestjs/testing';
import { MetaAdsAccountService } from './meta-ads-account.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';

describe('MetaAdsAccountService', () => {
  let service: MetaAdsAccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaAdsAccountService,
        {
          provide: PrismaService,
          useValue: {
            tenantMetaAdAccount: { upsert: jest.fn(), findMany: jest.fn(), update: jest.fn() }
          },
        },
        {
          provide: CryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: MetaMarketingConfigService,
          useValue: { getConfig: jest.fn().mockResolvedValue({ isEnabled: true, appId: '123' }) },
        },
      ],
    }).compile();

    service = module.get<MetaAdsAccountService>(MetaAdsAccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
