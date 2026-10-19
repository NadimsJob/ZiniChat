import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 1: Outreach Prisma Schema & Tenant Scaffolding (REQ-21, REQ-14, REQ-17)', () => {
  const schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  let schemaContent: string;

  beforeAll(() => {
    schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  });

  describe('Model Definitions & Schema Verification', () => {
    it('should define model TenantSmtpSetting with AES encrypted password and unique tenantId', () => {
      expect(schemaContent).toContain('model TenantSmtpSetting');
      expect(schemaContent).toMatch(/tenantId\s+String\s+@unique\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/passwordEncrypted\s+String/);
      expect(schemaContent).toMatch(/fromEmail\s+String/);
      expect(schemaContent).toMatch(/fromName\s+String/);
      expect(schemaContent).toMatch(/replyToEmail\s+String\?/);
      expect(schemaContent).toMatch(/isVerified\s+Boolean\s+@default\(false\)/);
      expect(schemaContent).toMatch(/dailySentCount\s+Int\s+@default\(0\)/);
      expect(schemaContent).toContain('@@map("tenant_smtp_settings")');
    });

    it('should define model EmailCampaign with metrics, storage accounting, and dual funnel fields', () => {
      expect(schemaContent).toContain('model EmailCampaign');
      expect(schemaContent).toMatch(/tenantId\s+String\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/bannerImageUrl\s+String/);
      expect(schemaContent).toMatch(/bannerClickUrl\s+String/);
      expect(schemaContent).toMatch(/bannerSizeBytes\s+Int\s+@default\(0\)/);
      expect(schemaContent).toMatch(/storageUsedBytes\s+BigInt\s+@default\(0\)/);
      expect(schemaContent).toMatch(/opensCount\s+Int\s+@default\(0\)/);
      expect(schemaContent).toMatch(/clicksCount\s+Int\s+@default\(0\)/);
      expect(schemaContent).toMatch(/ordersCount\s+Int\s+@default\(0\)/);
      expect(schemaContent).toMatch(/revenueGenerated\s+Decimal\s+@default\(0\.0\)\s+@db\.Decimal\(12,\s*2\)/);
      expect(schemaContent).toMatch(/phoneOnlyLeadsCount\s+Int\s+@default\(0\)/);
      expect(schemaContent).toMatch(/throttleIntervalSec\s+Int\s+@default\(60\)/);
      expect(schemaContent).toMatch(/language\s+String\s+@default\("bn"\)/);
      expect(schemaContent).toMatch(/tone\s+String\s+@default\("consultative"\)/);
      expect(schemaContent).toContain('@@index([tenantId, status])');
      expect(schemaContent).toContain('@@map("email_campaigns")');
    });

    it('should define model CampaignLead with tracking token, nullable email, phone-only flag, and funnel indexes', () => {
      expect(schemaContent).toContain('model CampaignLead');
      expect(schemaContent).toMatch(/campaignId\s+String\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/tenantId\s+String\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/trackingToken\s+String\s+@unique/);
      expect(schemaContent).toMatch(/email\s+String\?/);
      expect(schemaContent).toMatch(/phone\s+String\?/);
      expect(schemaContent).toMatch(/phoneOnly\s+Boolean\s+@default\(false\)/);
      expect(schemaContent).toMatch(/status\s+String\s+@default\("pending"\)/);
      expect(schemaContent).toMatch(/openedAt\s+DateTime\?/);
      expect(schemaContent).toMatch(/clickedAt\s+DateTime\?/);
      expect(schemaContent).toMatch(/orderedAt\s+DateTime\?/);
      expect(schemaContent).toMatch(/orderId\s+String\?\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/orderAmount\s+Decimal\?\s+@db\.Decimal\(12,\s*2\)/);
      expect(schemaContent).toContain('@@unique([campaignId, email])');
      expect(schemaContent).toContain('@@index([campaignId, status])');
      expect(schemaContent).toContain('@@index([campaignId, clickedAt, orderedAt])');
      expect(schemaContent).toContain('@@index([tenantId, email])');
      expect(schemaContent).toContain('@@index([tenantId, phone])');
      expect(schemaContent).toContain('@@map("campaign_leads")');
    });

    it('should define model OutreachSuppression for global and tenant-level unsubscribe suppression', () => {
      expect(schemaContent).toContain('model OutreachSuppression');
      expect(schemaContent).toMatch(/tenantId\s+String\?\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/email\s+String/);
      expect(schemaContent).toMatch(/reason\s+String\s+@default\("unsubscribed"\)/);
      expect(schemaContent).toContain('@@index([tenantId, email])');
      expect(schemaContent).toContain('@@map("outreach_suppressions")');
    });

    it('should define model GlobalOutreachConfig for superadmin master control & kill-switch', () => {
      expect(schemaContent).toContain('model GlobalOutreachConfig');
      expect(schemaContent).toMatch(/serpApiKeyEncrypted\s+String\?/);
      expect(schemaContent).toMatch(/serpApiProvider\s+String\s+@default\("serper"\)/);
      expect(schemaContent).toMatch(/visionAiProvider\s+String\s+@default\("gemini"\)/);
      expect(schemaContent).toMatch(/visionAiModel\s+String\s+@default\("gemini-1\.5-flash"\)/);
      expect(schemaContent).toMatch(/draftAiProvider\s+String\s+@default\("gemini"\)/);
      expect(schemaContent).toMatch(/draftAiModel\s+String\s+@default\("gemini-1\.5-flash"\)/);
      expect(schemaContent).toMatch(/isEmergencyPaused\s+Boolean\s+@default\(false\)/);
      expect(schemaContent).toMatch(/minThrottleIntervalSec\s+Int\s+@default\(60\)/);
      expect(schemaContent).toMatch(/dailyMaxEmailsPerTenant\s+Int\s+@default\(1000\)/);
      expect(schemaContent).toMatch(/visionCreditCost\s+Int\s+@default\(5\)/);
      expect(schemaContent).toMatch(/draftCreditCost\s+Int\s+@default\(1\)/);
      expect(schemaContent).toContain('@@map("global_outreach_configs")');
    });
  });

  describe('Bidirectional Model Relations & Referential Actions Integrity', () => {
    it('should verify Tenant has bidirectional relations to outreach models with cascade deletion', () => {
      expect(schemaContent).toMatch(/smtpSetting\s+TenantSmtpSetting\?/);
      expect(schemaContent).toMatch(/emailCampaigns\s+EmailCampaign\[\]/);
      expect(schemaContent).toMatch(/campaignLeads\s+CampaignLead\[\]/);
      expect(schemaContent).toMatch(/suppressions\s+OutreachSuppression\[\]/);

      // Verify cascade rules on relations to Tenant
      expect(schemaContent).toMatch(/tenant\s+Tenant\s+@relation\(fields:\s*\[tenantId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    });

    it('should verify Contact has bidirectional relation to CampaignLead with SetNull preservation', () => {
      expect(schemaContent).toMatch(/campaignLeads\s+CampaignLead\[\]/);
      expect(schemaContent).toMatch(/contact\s+Contact\?\s+@relation\(fields:\s*\[contactId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/);
    });

    it('should strictly verify Order preserves commercial sales data with onDelete: SetNull when outreach campaign is deleted', () => {
      expect(schemaContent).toMatch(/outreachCampaignId\s+String\?\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/outreachLeadId\s+String\?\s+@db\.Uuid/);
      expect(schemaContent).toMatch(/outreachCampaign\s+EmailCampaign\?\s+@relation\(fields:\s*\[outreachCampaignId\],\s*references:\s*\[id\],\s*onDelete:\s*SetNull\)/);
    });

    it('should verify Campaign deletion cascades to its CampaignLead records', () => {
      expect(schemaContent).toMatch(/campaign\s+EmailCampaign\s+@relation\(fields:\s*\[campaignId\],\s*references:\s*\[id\],\s*onDelete:\s*Cascade\)/);
    });
  });

  describe('Prisma Client Generated Types Verification', () => {
    it('should expose generated TypeScript client delegates for all 5 outreach models', () => {
      const prismaClient = new PrismaClient();
      expect(prismaClient).toBeDefined();
      expect((prismaClient as any).tenantSmtpSetting).toBeDefined();
      expect((prismaClient as any).emailCampaign).toBeDefined();
      expect((prismaClient as any).campaignLead).toBeDefined();
      expect((prismaClient as any).outreachSuppression).toBeDefined();
      expect((prismaClient as any).globalOutreachConfig).toBeDefined();
    });
  });
});
