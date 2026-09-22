import { Test, TestingModule } from '@nestjs/testing';
import { MetaMarketingConfigService } from './meta-marketing-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('MetaMarketingConfigService', () => {
  let service: MetaMarketingConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaMarketingConfigService,
        {
          provide: PrismaService,
          useValue: {
            metaMarketingApiConfig: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
            mcpToolRegistry: { findMany: jest.fn(), update: jest.fn() }
          },
        },
        {
          provide: CryptoService,
          useValue: { encrypt: jest.fn(), decrypt: jest.fn() },
        },
        {
          provide: AuditLogsService,
          useValue: { createSuperadminLog: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MetaMarketingConfigService>(MetaMarketingConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
