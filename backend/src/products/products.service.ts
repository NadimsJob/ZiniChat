import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from '../tenants/quota.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private quotaService: QuotaService,
  ) {}

  async getProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createProduct(tenantId: string, data: any) {
    await this.quotaService.checkProductCatalogQuota(tenantId);
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
        isActive: data.isActive !== undefined ? data.isActive : true,
        // Property Listing Mode fields (optional)
        listingType: data.listingType || null,
        images: Array.isArray(data.images) ? data.images : [],
        location: data.location || null,
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
        isActive: data.isActive,
        // Property Listing Mode fields
        ...(data.listingType !== undefined && { listingType: data.listingType }),
        ...(data.images !== undefined && { images: data.images }),
        ...(data.location !== undefined && { location: data.location }),
      }
    });
  }

  async deleteProduct(tenantId: string, id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Product not found');

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  // ── Property Gallery Methods ──────────────────────────────

  async addGalleryImage(tenantId: string, id: string, imageUrl: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Product not found');

    const currentImages: string[] = Array.isArray(existing.images) ? (existing.images as string[]) : [];
    const updated = [...currentImages, imageUrl].slice(0, 6); // max 6 photos

    return this.prisma.product.update({
      where: { id },
      data: { images: updated }
    });
  }

  async removeGalleryImage(tenantId: string, id: string, index: number) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Product not found');

    const currentImages: string[] = Array.isArray(existing.images) ? (existing.images as string[]) : [];
    const updated = currentImages.filter((_, i) => i !== index);

    return this.prisma.product.update({
      where: { id },
      data: { images: updated }
    });
  }

  // ── Permanent Dynamic Field Definitions (Tenant Scope) ──────

  async getCustomFieldDefs(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return [];
    const customFeatures: any = tenant.customFeatures || {};
    return Array.isArray(customFeatures.customFieldDefs) ? customFeatures.customFieldDefs : [];
  }

  async saveCustomFieldDef(tenantId: string, fieldDef: { name: string; type: string; options?: string[] }) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const customFeatures: any = tenant.customFeatures && typeof tenant.customFeatures === 'object' ? { ...tenant.customFeatures } : {};
    const existingDefs: any[] = Array.isArray(customFeatures.customFieldDefs) ? [...customFeatures.customFieldDefs] : [];

    // Filter out if existing key with same name
    const updatedDefs = existingDefs.filter((f: any) => f.name.toLowerCase() !== fieldDef.name.toLowerCase());
    updatedDefs.push({
      name: fieldDef.name,
      type: fieldDef.type || 'text',
      options: Array.isArray(fieldDef.options) ? fieldDef.options : []
    });

    customFeatures.customFieldDefs = updatedDefs;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customFeatures }
    });

    return updatedDefs;
  }

  async deleteCustomFieldDef(tenantId: string, name: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const customFeatures: any = tenant.customFeatures && typeof tenant.customFeatures === 'object' ? { ...tenant.customFeatures } : {};
    const existingDefs: any[] = Array.isArray(customFeatures.customFieldDefs) ? [...customFeatures.customFieldDefs] : [];

    const updatedDefs = existingDefs.filter((f: any) => f.name.toLowerCase() !== name.toLowerCase());
    customFeatures.customFieldDefs = updatedDefs;

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customFeatures }
    });

    return updatedDefs;
  }
}
