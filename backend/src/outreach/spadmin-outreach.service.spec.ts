import { Test, TestingModule } from '@nestjs/testing';
import { SpadminOutreachService } from './spadmin-outreach.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SpadminOutreachService (Phase 2: REQ-08, REQ-09, REQ-10, REQ-12)', () => {
  let service: SpadminOutreachService;
  let prisma: any;
  let crypto: any;
  let auditLogs: any;

  const mockConfigId = 'config-uuid-001';
  const superadminId = 'superadmin-uuid-001';

  let currentConfig: any = {
    id: mockConfigId,
    serpApiKeyEncrypted: null,
    serpApiProvider: 'serper',
    visionAiProvider: 'gemini',
    visionAiModel: 'gemini-1.5-flash',
    draftAiProvider: 'gemini',
    draftAiModel: 'gemini-1.5-flash',
    masterVisionPrompt: 'Vision prompt',
    masterDraftPrompt: 'Draft prompt',
    isEmergencyPaused: false,
    emergencyPausedReason: null,
    emergencyPausedAt: null,
    minThrottleIntervalSec: 60,
    dailyMaxEmailsPerTenant: 1000,
    visionCreditCost: 5,
    draftCreditCost: 1,
    updatedByUserId: null,
  };

  const createPrismaMock = () => ({
    globalOutreachConfig: {
      findFirst: jest.fn().mockImplementation(() => Promise.resolve(currentConfig)),
      create: jest.fn().mockImplementation((args) => {
        currentConfig = { id: mockConfigId, ...args.data };
        return Promise.resolve(currentConfig);
      }),
      update: jest.fn().mockImplementation((args) => {
        currentConfig = { ...currentConfig, ...args.data };
        return Promise.resolve(currentConfig);
      }),
    },
    emailCampaign: {
      count: jest.fn().mockResolvedValue(4),
      aggregate: jest.fn().mockResolvedValue({
        _sum: {
          sentCount: 1250,
          bouncedCount: 12,
          ordersCount: 35,
          revenueGenerated: 42000.5,
        },
      }),
    },
    campaignLead: {
      count: jest.fn().mockResolvedValue(150),
    },
    outreachSuppression: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  });

  const createCryptoMock = () => ({
    encrypt: jest.fn().mockImplementation((plain) => `encrypted_${plain}`),
    decrypt: jest.fn().mockImplementation((cipher) => cipher.replace('encrypted_', '')),
  });

  const createAuditLogsMock = () => ({
    createSuperadminLog: jest.fn().mockResolvedValue({ id: 'audit-log-001' }),
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    crypto = createCryptoMock();
    auditLogs = createAuditLogsMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpadminOutreachService,
        { provide: PrismaService, useValue: prisma },
        { provide: CryptoService, useValue: crypto },
        { provide: AuditLogsService, useValue: auditLogs },
      ],
    }).compile();

    service = module.get<SpadminOutreachService>(SpadminOutreachService);
  });

  describe('1. Global Configuration & Live Telemetry', () => {
    it('should return global configuration and telemetry with masked SERP key', async () => {
      currentConfig.serpApiKeyEncrypted = 'encrypted_secret_serper_key_12345';

      const result = await service.getConfig();

      expect(result).toBeDefined();
      expect(result.visionAiModel).toBe('gemini-1.5-flash');
      expect(result.hasSerpKey).toBe(true);
      expect(result.maskedSerpKey).toBe('secr...2345');
      expect(result.serpApiKeyEncrypted).toBeUndefined(); // strictly redacted
      expect(result.telemetry).toEqual({
        activeCampaignsCount: 4,
        totalSentToday: 150,
        totalPlatformSent: 1250,
        totalPlatformOrders: 35,
        totalPlatformRevenue: 42000.5,
        platformBounceRatePercent: expect.any(Number),
      });
    });
  });

  describe('2. Multi-Model AI Routing & Master Prompts Updates', () => {
    it('should update AI models and master prompts, recording an audit log (REQ-08, REQ-09, REQ-12)', async () => {
      const updateDto = {
        visionAiProvider: 'openai',
        visionAiModel: 'gpt-4o',
        draftAiProvider: 'anthropic',
        draftAiModel: 'claude-3-5-sonnet',
        masterVisionPrompt: 'Updated vision prompt instructions',
        masterDraftPrompt: 'Updated copywriting instructions {{clickUrl}}',
        visionCreditCost: 6,
        draftCreditCost: 2,
      };

      const result = await service.updateConfig(updateDto, superadminId);

      expect(prisma.globalOutreachConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockConfigId },
          data: expect.objectContaining({
            visionAiProvider: 'openai',
            visionAiModel: 'gpt-4o',
            draftAiProvider: 'anthropic',
            draftAiModel: 'claude-3-5-sonnet',
            visionCreditCost: 6,
            draftCreditCost: 2,
            updatedByUserId: superadminId,
          }),
        }),
      );

      // Verify Audit Log Emission (AGENTS.md Rule 2)
      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'UPDATE_OUTREACH_GLOBAL_CONFIG',
        expect.any(String),
        superadminId,
        expect.objectContaining({
          changes: expect.objectContaining({
            visionAiModel: 'gpt-4o',
            draftAiModel: 'claude-3-5-sonnet',
          }),
        }),
      );
    });

    it('should encrypt SERP master API key via AES-256 and redact it from audit log (REQ-01, REQ-12)', async () => {
      const updateDto = {
        serpApiKey: 'new_super_secret_serper_key_9999',
      };

      await service.updateConfig(updateDto, superadminId);

      expect(crypto.encrypt).toHaveBeenCalledWith('new_super_secret_serper_key_9999');
      expect(prisma.globalOutreachConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serpApiKeyEncrypted: 'encrypted_new_super_secret_serper_key_9999',
          }),
        }),
      );

      // Verify the raw key is never written to audit log
      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'UPDATE_OUTREACH_GLOBAL_CONFIG',
        expect.any(String),
        superadminId,
        expect.objectContaining({
          changes: expect.objectContaining({
            serpApiKey: '***REDACTED***',
          }),
        }),
      );
    });
  });

  describe('3. Platform-Wide Emergency Kill-Switch (REQ-10)', () => {
    it('should pause all platform outreach queues and log emergency reason', async () => {
      const result = await service.toggleEmergencyKillSwitch(true, 'DDoS / API Abuse Alert', superadminId);

      expect(result.isEmergencyPaused).toBe(true);
      expect(result.emergencyPausedReason).toBe('DDoS / API Abuse Alert');
      expect(result.emergencyPausedAt).toBeDefined();

      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'TOGGLE_OUTREACH_KILL_SWITCH',
        expect.stringContaining('Master Kill-Switch Activated'),
        superadminId,
        { isPaused: true, reason: 'DDoS / API Abuse Alert' },
      );
    });

    it('should resume platform outreach queues on kill-switch release', async () => {
      const result = await service.toggleEmergencyKillSwitch(false, undefined, superadminId);

      expect(result.isEmergencyPaused).toBe(false);
      expect(result.emergencyPausedReason).toBeNull();
      expect(result.emergencyPausedAt).toBeNull();

      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'TOGGLE_OUTREACH_KILL_SWITCH',
        expect.stringContaining('Queues Resumed'),
        superadminId,
        { isPaused: false, reason: undefined },
      );
    });
  });

  describe('4. Global Suppression & Compliance Blacklist (REQ-20)', () => {
    it('should add a domain/email to suppression list and normalize to lowercase', async () => {
      prisma.outreachSuppression.create.mockResolvedValue({
        id: 'suppression-001',
        email: 'blocked@gov.bd',
        tenantId: null,
        reason: 'admin_blocked',
      });

      const res = await service.addSuppression(
        { email: 'BLOCKED@GOV.BD', reason: 'Government domain protection' },
        superadminId,
      );

      expect(prisma.outreachSuppression.create).toHaveBeenCalledWith({
        data: {
          tenantId: null,
          email: 'blocked@gov.bd',
          reason: 'Government domain protection',
        },
      });

      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'ADD_OUTREACH_SUPPRESSION',
        expect.stringContaining('blocked@gov.bd'),
        superadminId,
        expect.any(Object),
      );
    });

    it('should reject invalid emails missing @ symbol', async () => {
      await expect(
        service.addSuppression({ email: 'invalid_domain_name' }, superadminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete a suppression entry and log the action', async () => {
      prisma.outreachSuppression.findUnique.mockResolvedValue({
        id: 'suppression-001',
        email: 'blocked@gov.bd',
      });
      prisma.outreachSuppression.delete.mockResolvedValue({ id: 'suppression-001' });

      const res = await service.deleteSuppression('suppression-001', superadminId);

      expect(res.success).toBe(true);
      expect(prisma.outreachSuppression.delete).toHaveBeenCalledWith({
        where: { id: 'suppression-001' },
      });
      expect(auditLogs.createSuperadminLog).toHaveBeenCalledWith(
        'DELETE_OUTREACH_SUPPRESSION',
        expect.stringContaining('blocked@gov.bd'),
        superadminId,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if suppression entry does not exist', async () => {
      prisma.outreachSuppression.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteSuppression('non-existent-id', superadminId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
