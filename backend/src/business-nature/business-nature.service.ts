import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessNatureService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.businessNature.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: { name: string; nameBn?: string; isActive?: boolean }) {
    return this.prisma.businessNature.create({
      data
    });
  }

  async update(id: string, data: { name?: string; nameBn?: string; isActive?: boolean }) {
    try {
      return await this.prisma.businessNature.update({
        where: { id },
        data
      });
    } catch (e) {
      throw new NotFoundException('Business nature not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.businessNature.delete({
        where: { id }
      });
      return { success: true };
    } catch (e) {
      throw new NotFoundException('Business nature not found');
    }
  }
}
