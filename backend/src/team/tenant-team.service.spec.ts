import { Test, TestingModule } from '@nestjs/testing';
import { TenantTeamService, ALL_MENU_PERMISSIONS } from './tenant-team.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  tenant: { findUnique: jest.fn() },
  user: { count: jest.fn(), create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  plan: { findUnique: jest.fn() },
  agentChannelAssignment: { createMany: jest.fn(), deleteMany: jest.fn() },
};

const mockSmtp = {
  triggerAgentCreatedEmail: jest.fn().mockResolvedValue(undefined),
};

const TENANT_ID = 'tenant-uuid-001';
const USER_ID = 'user-uuid-001';

const mockTenant = {
  id: TENANT_ID,
  businessName: 'Test Biz',
  planId: 'plan-001',
  customSeatLimit: null,
  plan: { seatLimit: 5 },
};

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  name: 'Test Agent',
  email: 'agent@test.com',
  role: 'agent',
  agentAccessMode: 'ALL_CHANNELS',
  permissions: ['inbox', 'leads'],
  createdAt: new Date(),
  channelAssignments: [],
};

describe('TenantTeamService', () => {
  let service: TenantTeamService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantTeamService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SmtpService, useValue: mockSmtp },
      ],
    }).compile();

    service = module.get<TenantTeamService>(TenantTeamService);
  });

  // ── Seat Limit Tests ──────────────────────────────────────────────────────

  describe('getEffectiveSeatLimit', () => {
    it('should use plan seatLimit when no custom override', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.user.count.mockResolvedValue(2);

      const result = await service.getEffectiveSeatLimit(TENANT_ID);
      expect(result).toEqual({ limit: 5, used: 2 });
    });

    it('should use customSeatLimit over plan seatLimit', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, customSeatLimit: 10 });
      mockPrisma.user.count.mockResolvedValue(3);

      const result = await service.getEffectiveSeatLimit(TENANT_ID);
      expect(result).toEqual({ limit: 10, used: 3 });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getEffectiveSeatLimit(TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── createAgent Tests ─────────────────────────────────────────────────────

  describe('createAgent', () => {
    beforeEach(() => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...mockUser, id: 'new-user' });
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, id: 'new-user' });
      mockPrisma.agentChannelAssignment.createMany.mockResolvedValue({ count: 0 });
    });

    it('should block creation when seat limit is reached', async () => {
      mockPrisma.user.count.mockResolvedValue(5); // At plan limit of 5
      await expect(
        service.createAgent(TENANT_ID, { name: 'X', email: 'x@x.com', role: 'agent' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow creation when customSeatLimit is higher than plan limit', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, customSeatLimit: 10 });
      mockPrisma.user.count.mockResolvedValue(5); // Under custom limit of 10

      await service.createAgent(TENANT_ID, {
        name: 'New', email: 'new@test.com', role: 'agent', menuPermissions: ['inbox']
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.createAgent(TENANT_ID, { name: 'X', email: 'existing@test.com', role: 'agent' })
      ).rejects.toThrow(ConflictException);
    });

    it('should save menuPermissions for agent role', async () => {
      await service.createAgent(TENANT_ID, {
        name: 'Agent', email: 'agent2@test.com', role: 'agent',
        menuPermissions: ['inbox', 'leads', 'broadcasts']
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: ['inbox', 'leads', 'broadcasts'] })
        })
      );
    });

    it('should save empty permissions for admin role (full access)', async () => {
      await service.createAgent(TENANT_ID, {
        name: 'Admin', email: 'admin@test.com', role: 'admin',
        menuPermissions: ['inbox'] // Should be ignored for admin
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: [] })
        })
      );
    });

    it('should filter out invalid permission keys for agent', async () => {
      await service.createAgent(TENANT_ID, {
        name: 'Agent', email: 'agent3@test.com', role: 'agent',
        menuPermissions: ['inbox', 'INVALID_KEY', 'leads']
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: ['inbox', 'leads'] })
        })
      );
    });

    it('should default agent to [inbox] if no menuPermissions specified', async () => {
      await service.createAgent(TENANT_ID, {
        name: 'Agent', email: 'agent4@test.com', role: 'agent'
        // no menuPermissions
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: ['inbox'] })
        })
      );
    });

    it('should assign channels when ASSIGNED_CHANNELS mode', async () => {
      const channels = ['ch-001', 'ch-002'];
      await service.createAgent(TENANT_ID, {
        name: 'Agent', email: 'agent5@test.com', role: 'agent',
        agentAccessMode: 'ASSIGNED_CHANNELS',
        assignedChannels: channels
      });
      expect(mockPrisma.agentChannelAssignment.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'new-user', channelConnectionId: 'ch-001' },
          { userId: 'new-user', channelConnectionId: 'ch-002' },
        ]
      });
    });
  });

  // ── findAll Tests ─────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return users with seatLimit and seatUsed', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll(TENANT_ID);
      expect(result).toMatchObject({ users: [mockUser], seatLimit: 5, seatUsed: 2 });
    });

    it('should reflect customSeatLimit in findAll response', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, customSeatLimit: 20 });
      mockPrisma.user.count.mockResolvedValue(4);
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.findAll(TENANT_ID);
      expect(result.seatLimit).toBe(20);
      expect(result.seatUsed).toBe(4);
    });
  });

  // ── updateAgent Tests ─────────────────────────────────────────────────────

  describe('updateAgent', () => {
    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.agentChannelAssignment.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.agentChannelAssignment.createMany.mockResolvedValue({ count: 0 });
    });

    it('should update permissions when menuPermissions provided', async () => {
      await service.updateAgent(TENANT_ID, USER_ID, {
        menuPermissions: ['inbox', 'leads', 'orders']
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: ['inbox', 'leads', 'orders'] })
        })
      );
    });

    it('should set empty permissions when upgrading agent to admin', async () => {
      await service.updateAgent(TENANT_ID, USER_ID, { role: 'admin' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ permissions: [] })
        })
      );
    });

    it('should NOT update permissions if neither role nor menuPermissions provided', async () => {
      await service.updateAgent(TENANT_ID, USER_ID, { name: 'New Name' });
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('permissions');
    });
  });

  // ── remove Tests ──────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete agent and their channel assignments', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.agentChannelAssignment.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove(TENANT_ID, USER_ID);
      expect(mockPrisma.agentChannelAssignment.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
      expect(result.success).toBe(true);
    });

    it('should throw BadRequestException when trying to delete owner', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ ...mockUser, role: 'owner' });
      await expect(service.remove(TENANT_ID, USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── ALL_MENU_PERMISSIONS constant ─────────────────────────────────────────

  describe('ALL_MENU_PERMISSIONS', () => {
    it('should contain all expected menu keys', () => {
      expect(ALL_MENU_PERMISSIONS).toContain('inbox');
      expect(ALL_MENU_PERMISSIONS).toContain('leads');
      expect(ALL_MENU_PERMISSIONS).toContain('broadcasts');
      expect(ALL_MENU_PERMISSIONS).toContain('orders');
      expect(ALL_MENU_PERMISSIONS).toContain('team');
      expect(ALL_MENU_PERMISSIONS).toContain('settings');
      expect(ALL_MENU_PERMISSIONS).toContain('ai_training');
      expect(ALL_MENU_PERMISSIONS).toContain('subscription');
    });
  });
});
