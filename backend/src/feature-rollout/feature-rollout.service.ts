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

    if (rollout) {
      if (rollout.isGlobal) {
        return true;
      }
      if (rollout.tenants.length > 0) {
        return rollout.tenants[0].isEnabled;
      }
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ['active', 'trialing'] } },
          orderBy: { currentPeriodEnd: 'desc' },
          include: { plan: true }
        }
      } as any
    });

    if (!tenant) return false;

    // Check customFeatures override
    if (tenant.customFeatures !== null && tenant.customFeatures !== undefined) {
      const customFeatures = Array.isArray(tenant.customFeatures)
        ? tenant.customFeatures
        : typeof tenant.customFeatures === 'string'
        ? JSON.parse(tenant.customFeatures)
        : [];
      if (Array.isArray(customFeatures) && customFeatures.includes(featureKey)) {
        return true;
      }
    }

    // Check Plan features (direct plan or active subscription plan)
    const activePlan = (tenant as any).plan || (tenant as any).subscriptions?.[0]?.plan;
    if (activePlan?.features) {
      const planFeatures = Array.isArray(activePlan.features)
        ? activePlan.features
        : typeof activePlan.features === 'string'
        ? JSON.parse(activePlan.features)
        : [];
      if (Array.isArray(planFeatures) && planFeatures.includes(featureKey)) {
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
