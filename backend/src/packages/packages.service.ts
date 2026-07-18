import { Injectable, NotFoundException } from '@nestjs/common';
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
    // In a real scenario, you might want to prevent deletion if there are active subscriptions.
    // For now, we will allow it or rely on foreign key constraints.
    return this.prisma.plan.delete({ where: { id } });
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
    return this.prisma.addon.delete({ where: { id } });
  }
}
