import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: { code: string; discountType: string; discountAmount: number; maxUses?: number }) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }
    return this.prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        discountType: data.discountType,
        discountAmount: data.discountAmount,
        maxUses: data.maxUses,
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

  async validate(code: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) throw new BadRequestException('Invalid coupon code');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.validUntil && coupon.validUntil < new Date()) throw new BadRequestException('Coupon expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('Coupon usage limit reached');
    
    return coupon;
  }
}
