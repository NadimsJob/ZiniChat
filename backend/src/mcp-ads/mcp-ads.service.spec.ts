import { Test, TestingModule } from '@nestjs/testing';
import { McpAdsService } from './mcp-ads.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('McpAdsService', () => {
  let service: McpAdsService;
  let prisma: any;
  let crypto: any;
  let marketingConfig: any;

  const mockTenantId = 'tenant-uuid-123';
  const mockAdAccountId = '123456789';
  const mockEncryptedToken = 'encrypted-token-xyz';
  const mockDecryptedToken = 'EAABb...longlivedtoken';

  beforeEach(async () => {
    prisma = {
      tenantMetaAdAccount: {
        findFirst: jest.fn(),
      },
    };

    crypto = {
      decrypt: jest.fn().mockReturnValue(mockDecryptedToken),
    };

    marketingConfig = {
      getConfig: jest.fn().mockResolvedValue({
        isEnabled: true,
        apiVersion: 'v21.0',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        McpAdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: MetaMarketingConfigService, useValue: marketingConfig },
      ],
    }).compile();

    service = module.get<McpAdsService>(McpAdsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAdAccountBalance', () => {
    it('should throw ForbiddenException if Meta Marketing API is disabled', async () => {
      marketingConfig.getConfig.mockResolvedValueOnce({ isEnabled: false });

      await expect(service.getAdAccountBalance(mockTenantId, mockAdAccountId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if tenant has no active account record', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce(null);

      await expect(service.getAdAccountBalance(mockTenantId, mockAdAccountId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return formatted balance data on success', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          account_id: '123456789',
          name: 'Test Ad Account',
          account_status: 1,
          balance: '5000',
          currency: 'BDT',
          spend_cap: '100000',
          amount_spent: '20000',
        },
      });

      const result = await service.getAdAccountBalance(mockTenantId, mockAdAccountId);

      expect(result).toEqual({
        adAccountId: '123456789',
        name: 'Test Ad Account',
        accountStatus: 1,
        balance: 50,
        currency: 'BDT',
        spendCap: 1000,
        amountSpent: 200,
        minDailyBudget: 0,
      });
      expect(crypto.decrypt).toHaveBeenCalledWith(mockEncryptedToken);
    });
  });

  describe('listCampaigns', () => {
    it('should return mapped campaigns list', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'camp_1',
              name: 'Campaign One',
              status: 'ACTIVE',
              effective_status: 'ACTIVE',
              objective: 'OUTCOME_SALES',
              daily_budget: '50000',
            },
          ],
        },
      });

      const result = await service.listCampaigns(mockTenantId, mockAdAccountId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'camp_1',
        name: 'Campaign One',
        status: 'ACTIVE',
        effectiveStatus: 'ACTIVE',
        objective: 'OUTCOME_SALES',
        dailyBudget: 500,
        lifetimeBudget: null,
        startTime: undefined,
        stopTime: undefined,
      });
    });
  });

  describe('getAdInsights', () => {
    it('should return mapped metrics from Meta Graph API', async () => {
      prisma.tenantMetaAdAccount.findFirst.mockResolvedValueOnce({
        accessToken: mockEncryptedToken,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              impressions: '1200',
              clicks: '150',
              spend: '45.50',
              cpc: '0.30',
              ctr: '12.5',
              reach: '900',
              actions: [{ action_type: 'purchase', value: '5' }],
            },
          ],
        },
      });

      const result = await service.getAdInsights(mockTenantId, mockAdAccountId, 'last_30d');

      expect(result).toEqual({
        impressions: 1200,
        clicks: 150,
        spend: 45.5,
        cpc: 0.3,
        ctr: 12.5,
        reach: 900,
        purchases: 5,
        leads: 0,
      });
    });
  });
});
