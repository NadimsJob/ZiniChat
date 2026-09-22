import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { MetaMarketingConfigService } from '../meta-marketing-config/meta-marketing-config.service';
import axios from 'axios';

@Injectable()
export class MetaAdsAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly marketingConfig: MetaMarketingConfigService,
  ) {}

  async initiateOAuth(tenantId: string, redirectUri: string) {
    // Check if the tenant has a connected Messenger or Instagram channel
    const channels = await this.prisma.channelConnection.findMany({
      where: {
        tenantId,
        channelType: { in: ['messenger', 'instagram'] },
        status: 'active'
      }
    });

    if (channels.length === 0) {
      throw new BadRequestException('You must connect a Facebook Page or Instagram channel first before connecting a Meta Ad Account.');
    }

    const config = await this.marketingConfig.getConfig();
    if (!config.isEnabled) throw new BadRequestException('Meta Marketing API is currently disabled.');
    if (!config.appId) throw new BadRequestException('Meta App ID is not configured.');

    const state = JSON.stringify({ tenantId });
    const authUrl = `https://www.facebook.com/${config.apiVersion}/dialog/oauth?client_id=${config.appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&scope=ads_management,ads_read,business_management`;

    return { url: authUrl };
  }

  async handleCallback(code: string, tenantId: string, redirectUri: string) {
    const config = await this.marketingConfig.getConfig();
    if (!config.appId || !config.appSecret) throw new BadRequestException('Meta App Config is incomplete.');

    try {
      // Exchange code for short-lived token
      const tokenRes = await axios.get(`https://graph.facebook.com/${config.apiVersion}/oauth/access_token`, {
        params: {
          client_id: config.appId,
          redirect_uri: redirectUri,
          client_secret: config.appSecret,
          code: code,
        }
      });
      let accessToken = tokenRes.data.access_token;

      // Exchange for long-lived token
      const longTokenRes = await axios.get(`https://graph.facebook.com/${config.apiVersion}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: config.appId,
          client_secret: config.appSecret,
          fb_exchange_token: accessToken,
        }
      });
      accessToken = longTokenRes.data.access_token;
      
      const expiresIn = longTokenRes.data.expires_in;
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

      // Fetch user's ad accounts
      const accountsRes = await axios.get(`https://graph.facebook.com/${config.apiVersion}/me/adaccounts`, {
        params: {
          access_token: accessToken,
          fields: 'account_id,name,currency,timezone_name'
        }
      });

      const adAccounts = accountsRes.data.data;
      if (!adAccounts || adAccounts.length === 0) {
        throw new BadRequestException('No ad accounts found for this Facebook user.');
      }

      // Encrypt token
      const encryptedToken = this.crypto.encrypt(accessToken);

      // Find connected channels to associate
      const channels = await this.prisma.channelConnection.findMany({
        where: {
          tenantId,
          channelType: { in: ['messenger', 'instagram'] },
          status: 'active'
        }
      });
      const messengerChannel = channels.find(c => c.channelType === 'messenger');
      const instagramChannel = channels.find(c => c.channelType === 'instagram');

      // Save the accounts
      for (const account of adAccounts) {
        await this.prisma.tenantMetaAdAccount.upsert({
          where: {
            tenantId_adAccountId: {
              tenantId,
              adAccountId: account.account_id
            }
          },
          update: {
            accessToken: encryptedToken,
            tokenExpiresAt: expiresAt,
            adAccountName: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            facebookPageId: messengerChannel?.externalAccountId,
            facebookPageName: messengerChannel?.displayName,
            instagramActorId: instagramChannel?.externalAccountId,
            status: 'active',
          },
          create: {
            tenantId,
            adAccountId: account.account_id,
            accessToken: encryptedToken,
            tokenExpiresAt: expiresAt,
            adAccountName: account.name,
            currency: account.currency,
            timezone: account.timezone_name,
            facebookPageId: messengerChannel?.externalAccountId,
            facebookPageName: messengerChannel?.displayName,
            instagramActorId: instagramChannel?.externalAccountId,
            status: 'active',
          }
        });
      }

      return { success: true, count: adAccounts.length };
    } catch (error: any) {
      console.error('Error in OAuth callback:', error.response?.data || error.message);
      throw new InternalServerErrorException('Failed to connect Meta Ad Account');
    }
  }

  async getConnectedAccounts(tenantId: string) {
    return this.prisma.tenantMetaAdAccount.findMany({
      where: { tenantId, status: 'active' },
      select: {
        id: true,
        adAccountId: true,
        adAccountName: true,
        currency: true,
        status: true,
        connectedAt: true
      }
    });
  }

  async disconnectAccount(tenantId: string, id: string) {
    return this.prisma.tenantMetaAdAccount.update({
      where: { id },
      data: { status: 'disconnected' }
    });
  }
}
