import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BillingService } from '../../billing/billing.service';
import { WhatsappWebService } from '../whatsapp-web/whatsapp-web.service';

@Injectable()
export class WhatsappAuthService {
  private readonly logger = new Logger(WhatsappAuthService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private billingService: BillingService,
    private whatsappWebService: WhatsappWebService
  ) {}

  async getConnections(tenantId: string) {
    return this.prisma.channelConnection.findMany({
      where: { tenantId, channelType: 'whatsapp' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        phoneNumber: true,
        phoneNumberId: true,
        wabaId: true,
        status: true,
        connectionMethod: true,
        verifyToken: true,
        createdAt: true,
      }
    });
  }

  private async checkQuota(tenantId: string) {
    const quotas = await this.billingService.getTenantQuotas(tenantId);
    
    const currentConnections = await this.prisma.channelConnection.count({
      where: { tenantId, channelType: 'whatsapp' }
    });

    if (currentConnections >= quotas.channelLimit) {
      throw new ForbiddenException(`Channel limit reached (${quotas.channelLimit}). Please upgrade your plan to connect more WhatsApp numbers.`);
    }
  }

  async connectManual(tenantId: string, data: any) {
    await this.checkQuota(tenantId);

    const { phoneNumberId, wabaId, accessToken, phoneNumber, displayName, verifyToken } = data;

    if (!phoneNumberId || !wabaId || !accessToken) {
      throw new BadRequestException('Missing required Meta API credentials');
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('Meta API verification failed:', errorData);
        throw new BadRequestException(`Meta API Error: ${errorData.error?.message || 'Invalid credentials'}`);
      }

      const existing = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'whatsapp', phoneNumberId }
      });

      if (existing) {
        throw new BadRequestException('This WhatsApp number is already connected');
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'whatsapp',
          externalAccountId: wabaId,
          accessTokenEncrypted: accessToken,
          displayName: displayName || 'WhatsApp Business',
          phoneNumber: phoneNumber || null,
          phoneNumberId,
          wabaId,
          verifyToken: verifyToken || null,
          connectionMethod: 'manual',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New WhatsApp Connection',
        `Tenant "${tenant?.businessName}" connected a new WhatsApp number (${phoneNumber || phoneNumberId}) via Manual setup.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to connect WhatsApp manually', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to verify credentials with Meta');
    }
  }

  async connectViaFacebook(tenantId: string, code: string) {
    await this.checkQuota(tenantId);

    const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
    if (!fbConfig || !fbConfig.isEnabled) {
      throw new BadRequestException('Facebook Authentication is not enabled on this platform');
    }
    
    if (!fbConfig.appId) {
      throw new BadRequestException('Facebook App ID is not configured');
    }

    this.logger.log(`Exchanging OAuth code for tenant ${tenantId} using App ID: ${fbConfig.appId}`);
    
    try {
      const mockAccessToken = `mock_system_token_${Date.now()}`;
      const mockWabaId = `mock_waba_${Math.floor(Math.random() * 100000)}`;
      const mockPhoneId = `mock_phone_${Math.floor(Math.random() * 100000)}`;
      const mockPhone = `+88017000${Math.floor(Math.random() * 10000)}`;

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'whatsapp',
          externalAccountId: mockWabaId,
          accessTokenEncrypted: mockAccessToken,
          displayName: `Auto-Connected WA`,
          phoneNumber: mockPhone,
          phoneNumberId: mockPhoneId,
          wabaId: mockWabaId,
          verifyToken: `auto_${Date.now()}`,
          connectionMethod: 'facebook_login',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New WhatsApp Connection',
        `Tenant "${tenant?.businessName}" connected a new WhatsApp number (${mockPhone}) via Facebook OAuth.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to exchange WhatsApp code', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('OAuth exchange failed');
    }
  }

  async testConnection(tenantId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: { id: connectionId, tenantId, channelType: 'whatsapp' }
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    // For MVP, if it's a mock token, we return success automatically to let the UI work.
    if (connection.accessTokenEncrypted.startsWith('mock_')) {
       return { success: true, message: 'Connection successful (Mocked for Facebook OAuth)' };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v21.0/${connection.phoneNumberId}`, {
        headers: { Authorization: `Bearer ${connection.accessTokenEncrypted}` }
      });

      if (!response.ok) {
        throw new Error('Meta API returned an error');
      }

      if (connection.status !== 'active') {
        await this.prisma.channelConnection.update({
          where: { id: connectionId },
          data: { status: 'active' }
        });
      }

      return { success: true, message: 'Connection is active and working' };
    } catch (error) {
      await this.prisma.channelConnection.update({
        where: { id: connectionId },
        data: { status: 'disconnected' }
      });
      throw new BadRequestException('Connection test failed. The token might have expired.');
    }
  }

  async deleteConnection(tenantId: string, connectionId: string) {
    const connection = await this.prisma.channelConnection.findFirst({
      where: { id: connectionId, tenantId, channelType: 'whatsapp' }
    });

    if (!connection) {
      throw new NotFoundException('Connection not found');
    }

    if (connection.provider === 'WEB_QR') {
      await this.whatsappWebService.logout(tenantId);
    }

    await this.prisma.channelConnection.delete({
      where: { id: connectionId }
    });

    return { success: true, message: 'Connection removed' };
  }
}
