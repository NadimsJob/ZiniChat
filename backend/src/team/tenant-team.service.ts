import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// All available menu permission keys for agent roles
export const ALL_MENU_PERMISSIONS = [
  'inbox',
  'leads',
  'products',
  'broadcasts',
  'orders',
  'team',
  'labels',
  'settings',
  'ai_training',
  'subscription',
  'support',
] as const;

export type MenuPermission = typeof ALL_MENU_PERMISSIONS[number];

@Injectable()
export class TenantTeamService {
  constructor(
    private prisma: PrismaService,
    private smtp: SmtpService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Returns the effective seat limit for a tenant, respecting custom overrides.
   */
  async getEffectiveSeatLimit(tenantId: string): Promise<{ limit: number; used: number }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: { select: { seatLimit: true } } }
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // customSeatLimit overrides plan seatLimit
    const limit = tenant.customSeatLimit ?? tenant.plan?.seatLimit ?? 1;
    const used = await this.prisma.user.count({ where: { tenantId } });
    return { limit, used };
  }

  async createAgent(tenantId: string, data: any) {
    const { name, email, password, role, agentAccessMode, assignedChannels, menuPermissions } = data;

    // 1. Check seat limit (with custom override)
    const { limit, used } = await this.getEffectiveSeatLimit(tenantId);
    if (used >= limit) {
      // Warn tenant owners that seat limit is reached
      const owners = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] } } });
      for (const owner of owners) {
        this.notificationsService.createNotification(
          owner.id,
          '🚨 Seat Limit Reached',
          `You have reached your team member seat limit (${used}/${limit}). Upgrade your plan to add more team members.`,
          'system'
        ).catch(() => {});
      }
      throw new ForbiddenException(
        `Seat limit reached. Your plan allows a maximum of ${limit} team members. Please upgrade your plan to add more.`
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // 2. Check existing email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email is already registered.');
    }

    // 3. Resolve permissions
    // Admin = empty array (full access enforced by role check in guards)
    // Agent = array of allowed menu keys from menuPermissions
    const resolvedPermissions = this.resolvePermissions(role, menuPermissions);

    // 4. Create user
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
        permissions: resolvedPermissions,
      },
    });

    // 5. Assign channels (only for agents with ASSIGNED_CHANNELS mode)
    if (agentAccessMode === 'ASSIGNED_CHANNELS' && Array.isArray(assignedChannels) && assignedChannels.length > 0) {
      await this.prisma.agentChannelAssignment.createMany({
        data: assignedChannels.map((channelId: string) => ({
          userId: user.id,
          channelConnectionId: channelId,
        }))
      });
    }

    // 6. Send welcome email
    try {
      await this.smtp.triggerAgentCreatedEmail(user.email, user.name, tenant.businessName, rawPassword);
    } catch (e) {
      console.error('Failed to send agent creation email:', e);
    }

    // 7. Send in-app welcome notification to the new team member
    this.notificationsService.createNotification(
      user.id,
      '👋 Welcome to the Team!',
      `You have been added to "${tenant.businessName}" as a ${role || 'agent'}. Check your email for login credentials.`,
      'system'
    ).catch(() => {});

    return this.findOne(tenantId, user.id);
  }

  async findAll(tenantId: string) {
    const [users, seatInfo] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          agentAccessMode: true,
          permissions: true,
          createdAt: true,
          channelAssignments: {
            select: { channelConnectionId: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      this.getEffectiveSeatLimit(tenantId)
    ]);

    return { users, seatLimit: seatInfo.limit, seatUsed: seatInfo.used };
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
        permissions: true,
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
    const { name, role, agentAccessMode, assignedChannels, password, menuPermissions } = data;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role && user.role !== 'owner') updateData.role = role;
    if (agentAccessMode) updateData.agentAccessMode = agentAccessMode;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    // Update permissions if role or menuPermissions changed
    const effectiveRole = role || user.role;
    if (role !== undefined || menuPermissions !== undefined) {
      updateData.permissions = this.resolvePermissions(effectiveRole, menuPermissions);
    }

    await this.prisma.user.update({
      where: { id },
      data: updateData
    });

    // Update channel assignments
    if (assignedChannels !== undefined) {
      await this.prisma.agentChannelAssignment.deleteMany({ where: { userId: id } });

      const effectiveMode = agentAccessMode || user.agentAccessMode;
      if (effectiveMode === 'ASSIGNED_CHANNELS' && Array.isArray(assignedChannels) && assignedChannels.length > 0) {
        await this.prisma.agentChannelAssignment.createMany({
          data: assignedChannels.map((channelId: string) => ({
            userId: id,
            channelConnectionId: channelId,
          }))
        });
      }
    }

    // Notify agent if their role or permissions changed
    if (role !== undefined || menuPermissions !== undefined) {
      this.notificationsService.createNotification(
        id,
        'ℹ️ Your account has been updated',
        `Your role or access permissions have been updated by an admin. Please refresh if you notice any changes.`,
        'system'
      ).catch(() => {});
    }

    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    const user = await this.findOne(tenantId, id);
    if (user.role === 'owner') {
      throw new BadRequestException('Cannot delete the tenant owner.');
    }

    await this.prisma.agentChannelAssignment.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });

    // Notify workspace owners/admins about removal
    const owners = await this.prisma.user.findMany({ where: { tenantId, role: { in: ['owner', 'admin'] }, id: { not: id } } });
    for (const owner of owners) {
      this.notificationsService.createNotification(
        owner.id,
        '👤 Team Member Removed',
        `"${user.name}" (${user.email}) has been removed from your workspace.`,
        'system'
      ).catch(() => {});
    }

    return { success: true, message: 'Team member removed successfully.' };
  }

  /**
   * Resolves the permissions array based on role and requested menu permissions.
   * - admin/owner → [] (empty = full access, enforced by RolesGuard)
   * - agent → validated array of allowed menu keys
   */
  private resolvePermissions(role: string, menuPermissions?: string[]): string[] {
    if (!role || role === 'admin' || role === 'owner') {
      return []; // Full access
    }
    // Agent: validate and filter to only known permission keys
    if (Array.isArray(menuPermissions)) {
      return menuPermissions.filter((p) =>
        (ALL_MENU_PERMISSIONS as readonly string[]).includes(p)
      );
    }
    // Default agent with no restrictions specified: give access to inbox only
    return ['inbox'];
  }
}
