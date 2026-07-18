import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(createTeamDto: any) {
    const { name, email, password, permissions } = createTeamDto;
    
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'superadmin',
        tenantId: null,
        permissions: permissions || []
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: 'superadmin', tenantId: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: 'superadmin', tenantId: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    });
    
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, updateTeamDto: any) {
    const { password, ...rest } = updateTeamDto;
    
    const user = await this.findOne(id);

    // Prevent removing permissions from the primary admin
    if (user.email === 'admin@platform.com') {
      if (rest.permissions && !rest.permissions.includes('*')) {
         throw new BadRequestException('Cannot modify permissions of primary superadmin');
      }
    }

    const updateData: any = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        createdAt: true
      }
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    if (user.email === 'admin@platform.com') {
      throw new BadRequestException('Cannot delete primary superadmin');
    }
    
    // Delete dependent audit logs first to prevent foreign key constraint errors
    await this.prisma.auditLog.deleteMany({ where: { actorUserId: id } });
    
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
