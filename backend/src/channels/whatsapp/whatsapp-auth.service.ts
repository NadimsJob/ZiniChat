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
        isAiAutoReplyEnabled: true,
      }
    });
  }

  async toggleAiReply(tenantId: string, connectionId: string, isEnabled: boolean) {
    const connection = await this.prisma.channelConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection || connection.tenantId !== tenantId) {
      throw new NotFoundException('Connection not found');
    }

    return this.prisma.channelConnection.update({
      where: { id: connectionId },
      data: { isAiAutoReplyEnabled: isEnabled }
    });
  }

  private async checkQuota(tenantId: string) {
    const quotas = await this.billingService.getTenantQuotas(tenantId);
    
    const currentConnections = await this.prisma.channelConnection.count({
      where: { tenantId, channelType: 'whatsapp' }
    });

    if (currentConnections >= quotas.whatsappLimit) {
      throw new ForbiddenException(`WhatsApp limit reached (${quotas.whatsappLimit}). Please upgrade your plan to connect more WhatsApp numbers.`);
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

  async getFacebookConfig() {
    const config = await this.prisma.facebookAuthConfig.findFirst();
    return {
      appId: config?.appId || '',
      isEnabled: config?.isEnabled ?? false
    };
  }

  async connectViaFacebook(tenantId: string, data: any) {
    await this.checkQuota(tenantId);

    const fbConfig = await this.prisma.facebookAuthConfig.findFirst();
    if (!fbConfig || !fbConfig.isEnabled) {
      throw new BadRequestException('Facebook Authentication is not enabled on this platform. Please contact Superadmin.');
    }
    
    if (!fbConfig.appId || !fbConfig.appSecret) {
      throw new BadRequestException('Facebook App ID and App Secret are required to complete Facebook Login. Please configure them in Superadmin > Settings > Facebook Auth.');
    }

    const payload = typeof data === 'string' ? { code: data, wabaId: undefined, phoneNumberId: undefined } : data;
    const { code, wabaId: passedWabaId, phoneNumberId: passedPhoneId } = payload;

    if (!code) {
      throw new BadRequestException('OAuth code is required');
    }

    this.logger.log(`Exchanging OAuth code for tenant ${tenantId} using App ID: ${fbConfig.appId}`);
    
    try {
      // Step 1: Exchange authorization code for Meta User Access Token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${fbConfig.appId}&client_secret=${encodeURIComponent(fbConfig.appSecret)}&code=${encodeURIComponent(code)}`;
      
      const tokenRes = await fetch(tokenUrl);
      if (!tokenRes.ok) {
        const errorData = await tokenRes.json().catch(() => ({}));
        this.logger.error('Failed to exchange code with Meta API:', errorData);
        throw new BadRequestException(`Meta OAuth Error: ${errorData.error?.message || 'Failed to exchange authorization code with Meta'}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      if (!accessToken) {
        throw new BadRequestException('No access token returned from Meta API.');
      }

      let targetWabaId = passedWabaId;
      let targetPhoneId = passedPhoneId;
      let phoneNumber: string | null = null;
      let displayName = 'WhatsApp Business';

      // Step 2: Fetch phone details if phoneNumberId is provided
      if (targetPhoneId) {
        const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${targetPhoneId}?access_token=${accessToken}`);
        if (phoneRes.ok) {
          const phoneData = await phoneRes.json();
          phoneNumber = phoneData.display_phone_number || phoneData.verified_name || null;
          if (phoneData.verified_name) displayName = phoneData.verified_name;
        }
      }

      // Step 3: If WABA ID or Phone ID missing, query debug_token or client's WABAs
      if (!targetWabaId || !targetPhoneId) {
        const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`);
        if (debugRes.ok) {
          const debugData = await debugRes.json();
          const targetWabaObj = debugData.data?.granular_scopes?.find((s: any) => s.scope === 'whatsapp_business_management');
          if (targetWabaObj?.target_ids?.length > 0) {
            targetWabaId = targetWabaObj.target_ids[0];
          }
        }

        if (targetWabaId) {
          const numbersRes = await fetch(`https://graph.facebook.com/v21.0/${targetWabaId}/phone_numbers?access_token=${accessToken}`);
          if (numbersRes.ok) {
            const numbersData = await numbersRes.json();
            if (numbersData.data && numbersData.data.length > 0) {
              const firstNum = numbersData.data[0];
              targetPhoneId = targetPhoneId || firstNum.id;
              phoneNumber = phoneNumber || firstNum.display_phone_number;
              displayName = firstNum.verified_name || displayName;
            }
          }
        }
      }

      if (!targetWabaId || !targetPhoneId) {
        throw new BadRequestException('Could not retrieve WhatsApp Business Account (WABA) or Phone Number ID from Meta. Please ensure you selected a WABA during login or use Manual token connection.');
      }

      // Check if connection already exists
      const existing = await this.prisma.channelConnection.findFirst({
        where: { tenantId, channelType: 'whatsapp', phoneNumberId: targetPhoneId }
      });

      if (existing) {
        const updated = await this.prisma.channelConnection.update({
          where: { id: existing.id },
          data: {
            accessTokenEncrypted: accessToken,
            wabaId: targetWabaId,
            phoneNumber: phoneNumber || existing.phoneNumber,
            displayName: displayName || existing.displayName,
            status: 'active'
          }
        });
        return { success: true, connectionId: updated.id, message: 'WhatsApp connection updated' };
      }

      const connection = await this.prisma.channelConnection.create({
        data: {
          tenantId,
          channelType: 'whatsapp',
          externalAccountId: targetWabaId,
          accessTokenEncrypted: accessToken,
          displayName: displayName || 'WhatsApp Business',
          phoneNumber: phoneNumber || null,
          phoneNumberId: targetPhoneId,
          wabaId: targetWabaId,
          verifyToken: `fb_oauth_${Date.now()}`,
          connectionMethod: 'facebook_login',
          status: 'active'
        }
      });

      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      this.notificationsService.createSystemNotificationForSuperadmins(
        'New WhatsApp Connection',
        `Tenant "${tenant?.businessName}" connected a new WhatsApp number (${phoneNumber || targetPhoneId}) via Facebook OAuth.`,
        'info'
      ).catch(e => this.logger.error('Failed to send notification', e));

      return { success: true, connectionId: connection.id };
    } catch (error) {
      this.logger.error('Failed to exchange WhatsApp code', error);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException(`OAuth exchange failed: ${error.message || 'Unknown error'}`);
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
