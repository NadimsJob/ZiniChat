import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  // --- Plans ---
  async getActivePlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthlyBdt: 'asc' }
    });
  }

  async getAllPlans() {
    return this.prisma.plan.findMany({
      orderBy: { priceMonthlyBdt: 'asc' }
    });
  }

  async createPlan(data: any) {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: any) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
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
      return { success: true, message: 'Package is linked to existing tenants or subscriptions. It has been deactivated instead.' };
    }

    await this.prisma.plan.delete({ where: { id } });
    return { success: true, message: 'Package deleted successfully' };
  }

  async setDefaultPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    await this.prisma.$transaction([
      this.prisma.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      }),
      this.prisma.plan.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

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
