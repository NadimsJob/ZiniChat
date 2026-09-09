import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicClientBrands() {
    return this.prisma.clientBrand.findMany({
      where: { isActive: true },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async getAllClientBrands() {
    return this.prisma.clientBrand.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    });
  }

  async createClientBrand(data: { name: string; logoUrl?: string; order?: number; isActive?: boolean }) {
    return this.prisma.clientBrand.create({
      data: {
        name: data.name,
        logoUrl: data.logoUrl || null,
        order: data.order !== undefined ? Number(data.order) : 0,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      }
    });
  }

  async updateClientBrand(id: string, data: { name?: string; logoUrl?: string; order?: number; isActive?: boolean }) {
    const existing = await this.prisma.clientBrand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Client brand not found');
    }
    return this.prisma.clientBrand.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.order !== undefined && { order: Number(data.order) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      }
    });
  }

  async deleteClientBrand(id: string) {
    const existing = await this.prisma.clientBrand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Client brand not found');
    }
    await this.prisma.clientBrand.delete({ where: { id } });
    return { success: true };
  }
}
