import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureRolloutService {
  private readonly logger = new Logger(FeatureRolloutService.name);

  constructor(private prisma: PrismaService) {}

  async isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
    const rollout = await this.prisma.featureRollout.findUnique({
      where: { featureKey },
      include: {
        tenants: {
          where: { tenantId }
        }
      }
    });

    if (!rollout) {
      return false;
    }

    // Level 2: Global check
    if (rollout.isGlobal) {
      return true;
    }

    // Level 4: Tenant specific override
    if (rollout.tenants.length > 0) {
      return rollout.tenants[0].isEnabled;
    }

    // Level 3: Plan-wise feature check
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true }
    });

    if (tenant?.plan?.features) {
      const features = tenant.plan.features as string[];
      if (features.includes(featureKey)) {
        return true;
      }
    }

    if (tenant?.customFeatures) {
      const customFeatures = tenant.customFeatures as string[];
      if (customFeatures.includes(featureKey)) {
        return true;
      }
    }

    return false;
  }

  async getAllRollouts() {
    return this.prisma.featureRollout.findMany({
      include: {
        _count: {
          select: { tenants: { where: { isEnabled: true } } }
        }
      }
    });
  }

  async enableForTenant(featureKey: string, tenantId: string): Promise<void> {
    let rollout = await this.prisma.featureRollout.findUnique({ where: { featureKey } });
    if (!rollout) {
      rollout = await this.prisma.featureRollout.create({
        data: { featureKey }
      });
    }

    await this.prisma.featureRolloutTenant.upsert({
      where: {
        featureRolloutId_tenantId: {
          featureRolloutId: rollout.id,
          tenantId
        }
      },
      update: { isEnabled: true, enabledAt: new Date() },
      create: {
        featureRollout: { connect: { id: rollout.id } },
        tenant: { connect: { id: tenantId } },
        isEnabled: true
      }
    });
  }

  async disableForTenant(featureKey: string, tenantId: string): Promise<void> {
    let rollout = await this.prisma.featureRollout.findUnique({ where: { featureKey } });
    if (!rollout) {
       rollout = await this.prisma.featureRollout.create({ data: { featureKey } });
    }

    await this.prisma.featureRolloutTenant.upsert({
      where: {
        featureRolloutId_tenantId: {
          featureRolloutId: rollout.id,
          tenantId
        }
      },
      update: { isEnabled: false },
      create: {
        featureRollout: { connect: { id: rollout.id } },
        tenant: { connect: { id: tenantId } },
        isEnabled: false
      }
    });
  }

  async setGlobalStatus(featureKey: string, isGlobal: boolean): Promise<void> {
    await this.prisma.featureRollout.upsert({
      where: { featureKey },
      update: { isGlobal },
      create: { featureKey, isGlobal }
    });
  }

  async getTenantRollouts(featureKey: string) {
     const rollout = await this.prisma.featureRollout.findUnique({ where: { featureKey } });
     if (!rollout) return [];
     
     return this.prisma.featureRolloutTenant.findMany({
       where: { featureRolloutId: rollout.id },
       include: {
         tenant: {
           select: { id: true, businessName: true, plan: { select: { name: true } } }
         }
       }
     });
  }
}
