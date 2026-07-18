import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createProduct(tenantId: string, data: any) {
    return this.prisma.product.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        price: data.price,
        sku: data.sku,
        imageUrl: data.imageUrl,
        trackInventory: data.trackInventory || false,
        stockCount: data.stockCount || 0,
        attributes: data.attributes || {},
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    });
  }

  async updateProduct(tenantId: string, id: string, data: any) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        sku: data.sku,
        imageUrl: data.imageUrl,
        trackInventory: data.trackInventory,
        stockCount: data.stockCount,
        attributes: data.attributes,
        isActive: data.isActive
      }
    });
  }

  async deleteProduct(tenantId: string, id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }
}
