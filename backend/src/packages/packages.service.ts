import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  private cachedActivePlans: any = null;
  private plansCacheExpiresAt: number = 0;

  invalidateCache() {
    this.cachedActivePlans = null;
    this.plansCacheExpiresAt = 0;
  }

  // --- Plans ---
  async getActivePlans() {
    if (this.cachedActivePlans && Date.now() < this.plansCacheExpiresAt) {
      return this.cachedActivePlans;
    }

    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyBdt: 'asc' }
    });

    this.cachedActivePlans = plans;
    this.plansCacheExpiresAt = Date.now() + 5 * 60 * 1000; // 5 min TTL
    return plans;
  }

  async getAllPlans() {
    return this.prisma.plan.findMany({
      orderBy: { priceMonthlyBdt: 'asc' }
    });
  }

  async createPlan(data: any) {
    this.invalidateCache();
    const res = await this.prisma.plan.create({ data });
    this.invalidateCache();
    return res;
  }

  async updatePlan(id: string, data: any) {
    this.invalidateCache();
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    const res = await this.prisma.plan.update({ where: { id }, data });
    this.invalidateCache();
    return res;
  }

  async deletePlan(id: string) {
    this.invalidateCache();
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { tenants: true, subscriptions: true } } }
    });
    if (!plan) throw new NotFoundException('Package not found');
    if (plan.isDefault) {
      throw new BadRequestException('Cannot delete default package. Please set another package as default first.');
    }

    const linkedCount = (plan._count?.tenants || 0) + (plan._count?.subscriptions || 0);
    if (linkedCount > 0) {
      await this.prisma.plan.update({
        where: { id },
        data: { isActive: false }
      });
      this.invalidateCache();
      return { success: true, message: 'Package is linked to existing tenants or subscriptions. It has been deactivated instead.' };
    }

    await this.prisma.plan.delete({ where: { id } });
    this.invalidateCache();
    return { success: true, message: 'Package deleted successfully' };
  }

  async setDefaultPlan(id: string) {
    this.invalidateCache();
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const res = await this.prisma.$transaction([
      this.prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      }),
      this.prisma.plan.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);
    this.invalidateCache();
    return { success: true, message: 'Default plan updated' };
  }

  // --- Addons ---
  async getActiveAddons() {
    return this.prisma.addon.findMany({
      where: { isActive: true },
      orderBy: { priceBdt: 'asc' }
    });
  }

  async getAllAddons() {
    return this.prisma.addon.findMany({
      orderBy: { priceBdt: 'asc' }
    });
  }

  async createAddon(data: any) {
    return this.prisma.addon.create({ data });
  }

  async updateAddon(id: string, data: any) {
    const addon = await this.prisma.addon.findUnique({ where: { id } });
    if (!addon) throw new NotFoundException('Addon not found');
    return this.prisma.addon.update({ where: { id }, data });
  }

  async deleteAddon(id: string) {
    const addon = await this.prisma.addon.findUnique({
      where: { id },
      include: { _count: { select: { payments: true } } }
    });
    if (!addon) throw new NotFoundException('Addon not found');

    const linkedCount = addon._count?.payments || 0;
    if (linkedCount > 0) {
      await this.prisma.addon.update({
        where: { id },
        data: { isActive: false }
      });
      return { success: true, message: 'Addon is linked to billing records. It has been deactivated instead.' };
    }

    await this.prisma.addon.delete({ where: { id } });
    return { success: true, message: 'Addon deleted successfully' };
  }
}
