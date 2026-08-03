import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            brandName: true,
            ownerName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: {
    code: string;
    discountType: string;
    discountAmount: number;
    maxUses?: number;
    validUntil?: string | Date;
    tenantId?: string;
  }) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code.toUpperCase() } });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }
    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountAmount: data.discountAmount,
        maxUses: data.maxUses ? Number(data.maxUses) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        tenantId: data.tenantId ? data.tenantId : null,
      },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            brandName: true,
            ownerName: true,
          }
        }
      }
    });
  }

  async toggleStatus(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new BadRequestException('Coupon not found');
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive }
    });
  }

  async validate(code: string, tenantId?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new BadRequestException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) throw new BadRequestException('Coupon expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');
    if (coupon.tenantId && coupon.tenantId !== tenantId) throw new BadRequestException('This coupon is not valid for your account');
    
    return coupon;
  }
}
