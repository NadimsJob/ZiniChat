import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class TenantTeamService {
  constructor(
    private prisma: PrismaService,
    private smtp: SmtpService
  ) {}

  async createAgent(tenantId: string, data: any) {
    const { name, email, password, role, agentAccessMode, assignedChannels } = data;

    // 1. Check seat limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    let maxSeats = 1;
    if (tenant.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: tenant.planId } });
      if (plan) maxSeats = plan.seatLimit;
    }
    const totalUsersCount = await this.prisma.user.count({ where: { tenantId } });

    if (totalUsersCount >= maxSeats) {
      throw new ForbiddenException(`Seat limit reached. Your plan allows a maximum of ${maxSeats} users.`);
    }

    // 2. Check existing email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    // 3. Create user
    let rawPassword = password;
    if (!rawPassword) {
      rawPassword = crypto.randomBytes(4).toString('hex');
    }
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        name,
        email,
        passwordHash,
        role: role || 'agent',
        agentAccessMode: agentAccessMode || 'ALL_CHANNELS',
      },
    });

    // 4. Assign channels
    if (agentAccessMode === 'ASSIGNED_CHANNELS' && Array.isArray(assignedChannels)) {
      const assignments = assignedChannels.map(channelId => ({
        userId: user.id,
        channelConnectionId: channelId,
      }));
      if (assignments.length > 0) {
        await this.prisma.agentChannelAssignment.createMany({
          data: assignments
        });
      }
    }

    // 5. Send Email
    try {
      await this.smtp.triggerAgentCreatedEmail(user.email, user.name, tenant.businessName, rawPassword);
    } catch (e) {
      console.error('Failed to send agent creation email:', e);
    }

    return this.findOne(tenantId, user.id);
  }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agentAccessMode: true,
        createdAt: true,
        channelAssignments: {
          select: { channelConnectionId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agentAccessMode: true,
        createdAt: true,
        channelAssignments: {
          select: { channelConnectionId: true }
        }
      }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateAgent(tenantId: string, id: string, data: any) {
    const user = await this.findOne(tenantId, id);
    const { name, role, agentAccessMode, assignedChannels, password } = data;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role && user.role !== 'owner') updateData.role = role;
    if (agentAccessMode) updateData.agentAccessMode = agentAccessMode;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id },
      data: updateData
    });

    if (assignedChannels !== undefined) {
      await this.prisma.agentChannelAssignment.deleteMany({
        where: { userId: id }
      });

      if (updateData.agentAccessMode === 'ASSIGNED_CHANNELS' || (!updateData.agentAccessMode && user.agentAccessMode === 'ASSIGNED_CHANNELS')) {
        if (Array.isArray(assignedChannels) && assignedChannels.length > 0) {
          const assignments = assignedChannels.map(channelId => ({
            userId: id,
            channelConnectionId: channelId,
          }));
          await this.prisma.agentChannelAssignment.createMany({
            data: assignments
          });
        }
      }
    }

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const user = await this.findOne(tenantId, id);
    if (user.role === 'owner') {
      throw new BadRequestException('Cannot delete the tenant owner');
    }

    return this.prisma.user.delete({
      where: { id }
    });
  }
}
