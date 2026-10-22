import { Injectable, Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { QuotaService } from '../tenants/quota.service';
import * as nodemailer from 'nodemailer';

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertTenantSmtpDto {
  @IsString()
  @IsNotEmpty()
  host!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  port?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  secure?: boolean;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsEmail()
  @IsNotEmpty()
  fromEmail!: string;

  @IsString()
  @IsNotEmpty()
  fromName!: string;

  @IsOptional()
  @IsEmail()
  replyToEmail?: string;
}

export class VerifyTenantSmtpDto {
  @IsOptional()
  @IsEmail()
  testRecipientEmail?: string;
}

@Injectable()
export class TenantSmtpService {
  private readonly logger = new Logger(TenantSmtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Retrieves sanitized SMTP configuration for a given tenant (password is never exposed).
   */
  async getSmtpSetting(tenantId: string) {
    const setting = await this.prisma.tenantSmtpSetting.findUnique({
      where: { tenantId },
    });

    if (!setting) return null;

    return {
      id: setting.id,
      tenantId: setting.tenantId,
      host: setting.host,
      port: setting.port,
      secure: setting.secure,
      username: setting.username,
      hasPassword: !!setting.passwordEncrypted,
      fromEmail: setting.fromEmail,
      fromName: setting.fromName,
      replyToEmail: setting.replyToEmail,
      isVerified: setting.isVerified,
      lastVerifiedAt: setting.lastVerifiedAt,
      dailySentCount: setting.dailySentCount,
      lastSentDate: setting.lastSentDate,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * Upserts tenant SMTP configuration with AES-256 encryption for the password.
   */
  async upsertSmtpSetting(tenantId: string, dto: UpsertTenantSmtpDto, actorUserId?: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Zini-Mail SMTP Configuration');

    if (!dto.host || !dto.username || !dto.fromEmail || !dto.fromName) {
      throw new BadRequestException('Host, username, sender email, and sender name are required');
    }

    if (!dto.fromEmail.includes('@') || !dto.fromEmail.includes('.')) {
      throw new BadRequestException('Please provide a valid sender email address');
    }

    if (dto.replyToEmail && (!dto.replyToEmail.includes('@') || !dto.replyToEmail.includes('.'))) {
      throw new BadRequestException('Please provide a valid reply-to email address');
    }

    const host = dto.host.trim().toLowerCase();
    const username = dto.username.trim();
    const fromEmail = dto.fromEmail.trim().toLowerCase();
    const fromName = dto.fromName.trim();
    const replyToEmail = dto.replyToEmail ? dto.replyToEmail.trim().toLowerCase() : null;

    // Resolve port & secure defaults
    const isPort465 = dto.port === 465;
    const port = dto.port ? Number(dto.port) : (dto.secure ? 465 : 587);
    const secure = dto.secure !== undefined ? dto.secure : (port === 465);

    const existing = await this.prisma.tenantSmtpSetting.findUnique({
      where: { tenantId },
    });

    let passwordEncrypted = existing?.passwordEncrypted || '';

    if (dto.password && dto.password.trim()) {
      passwordEncrypted = this.crypto.encrypt(dto.password.trim());
    } else if (!existing || !existing.passwordEncrypted) {
      throw new BadRequestException('Password / App Password is required when configuring SMTP for the first time');
    }

    // Check if critical connection parameters changed to require re-verification
    const connectionChanged =
      !existing ||
      existing.host !== host ||
      existing.port !== port ||
      existing.username !== username ||
      existing.secure !== secure ||
      (dto.password && dto.password.trim().length > 0);

    const isVerified = connectionChanged ? false : (existing ? existing.isVerified : false);
    const lastVerifiedAt = connectionChanged ? null : (existing ? existing.lastVerifiedAt : null);

    await this.prisma.tenantSmtpSetting.upsert({
      where: { tenantId },
      create: {
        tenantId,
        host,
        port,
        secure,
        username,
        passwordEncrypted,
        fromEmail,
        fromName,
        replyToEmail,
        isVerified,
        lastVerifiedAt,
      },
      update: {
        host,
        port,
        secure,
        username,
        passwordEncrypted,
        fromEmail,
        fromName,
        replyToEmail,
        isVerified,
        lastVerifiedAt,
      },
    });

    return this.getSmtpSetting(tenantId);
  }

  /**
   * Probes the tenant's SMTP server via handshake and optional test email dispatch.
   */
  async verifySmtpConnection(tenantId: string, testRecipientEmail?: string) {
    await this.quotaService.checkActiveSubscription(tenantId, 'Zini-Mail SMTP Verification');

    const setting = await this.prisma.tenantSmtpSetting.findUnique({
      where: { tenantId },
    });

    if (!setting) {
      throw new NotFoundException('No SMTP settings configured for this tenant. Please save credentials first.');
    }

    if (!setting.passwordEncrypted) {
      throw new BadRequestException('SMTP password is missing or unconfigured.');
    }

    let decryptedPassword = '';
    try {
      decryptedPassword = this.crypto.decrypt(setting.passwordEncrypted);
    } catch (err: any) {
      throw new InternalServerErrorException('Failed to decrypt saved SMTP credentials');
    }

    const transporter = nodemailer.createTransport({
      host: setting.host,
      port: setting.port,
      secure: setting.secure,
      auth: {
        user: setting.username,
        pass: decryptedPassword,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    try {
      // 1. Verify handshake
      await transporter.verify();

      // 2. Dispatch verification test email
      const recipient = testRecipientEmail?.trim() || setting.fromEmail;
      await transporter.sendMail({
        from: `"${setting.fromName}" <${setting.fromEmail}>`,
        to: recipient,
        replyTo: setting.replyToEmail || setting.fromEmail,
        subject: '✅ [Zini-Mail] SMTP Connection Test Successful',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; padding: 24px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <div style="background: rgba(31, 130, 74, 0.2); border: 1px solid rgba(31, 130, 74, 0.4); width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 20px;">
                ✓
              </div>
              <div>
                <h2 style="margin: 0; font-size: 18px; color: #ffffff;">Zini-Mail SMTP Verified</h2>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Autonomous AI Cold Outreach Engine</p>
              </div>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
              Your custom SMTP server has successfully connected to Zini-Mail! Handshake, TLS negotiation, and test dispatch succeeded.
            </p>
            <div style="background: rgba(30, 41, 59, 0.7); border-radius: 10px; padding: 14px; margin: 18px 0; font-family: monospace; font-size: 12px; color: #e2e8f0;">
              <div><strong>Host:</strong> ${setting.host}</div>
              <div><strong>Port:</strong> ${setting.port} (${setting.secure ? 'SSL' : 'STARTTLS'})</div>
              <div><strong>Username:</strong> ${setting.username}</div>
              <div><strong>Sender:</strong> ${setting.fromName} &lt;${setting.fromEmail}&gt;</div>
              ${setting.replyToEmail ? `<div><strong>Reply-To:</strong> ${setting.replyToEmail}</div>` : ''}
              <div><strong>Delivered To:</strong> ${recipient}</div>
              <div><strong>Verified At:</strong> ${new Date().toUTCString()}</div>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
              ZiniChat • Autonomous Cold Outreach & CRM Ecosystem
            </p>
          </div>
        `,
      });

      const updated = await this.prisma.tenantSmtpSetting.update({
        where: { tenantId },
        data: {
          isVerified: true,
          lastVerifiedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `SMTP connection verified and test email dispatched to ${recipient}!`,
        host: setting.host,
        port: setting.port,
        secure: setting.secure,
        lastVerifiedAt: updated.lastVerifiedAt,
      };
    } catch (err: any) {
      this.logger.error(`SMTP Verification Failed for tenant ${tenantId}: ${err.message}`, err.stack);

      // Reset verification state on failure
      await this.prisma.tenantSmtpSetting.update({
        where: { tenantId },
        data: {
          isVerified: false,
        },
      });

      let advice = err.message;
      const lowerMsg = (err.message || '').toLowerCase();

      if (lowerMsg.includes('eauth') || lowerMsg.includes('535') || lowerMsg.includes('username and password not accepted')) {
        advice = 'Authentication failed. Please verify your username and password. Note: If using Gmail, you must enable 2FA and use a 16-character Google App Password, not your standard Google account password.';
      } else if (lowerMsg.includes('etimedout') || lowerMsg.includes('esocket')) {
        advice = `Connection timed out while reaching ${setting.host}:${setting.port}. Please verify the host address and check if your hosting firewall allows outbound SMTP connections.`;
      } else if (lowerMsg.includes('econnrefused')) {
        advice = `Connection refused by ${setting.host}:${setting.port}. Please check if the port number (587 or 465) is correct.`;
      }

      throw new BadRequestException(`SMTP verification failed: ${advice}`);
    }
  }

  /**
   * Deletes tenant SMTP configuration.
   */
  async deleteSmtpSetting(tenantId: string) {
    await this.prisma.tenantSmtpSetting.deleteMany({
      where: { tenantId },
    });

    return {
      success: true,
      message: 'SMTP settings removed successfully',
    };
  }

  /**
   * Internal helper: returns an authenticated Nodemailer transporter for outbound campaign dispatchers.
   */
  async getDecryptedTransporter(tenantId: string): Promise<nodemailer.Transporter> {
    const setting = await this.prisma.tenantSmtpSetting.findUnique({
      where: { tenantId },
    });

    if (!setting) {
      throw new NotFoundException('Tenant SMTP settings not configured');
    }

    if (!setting.isVerified) {
      throw new BadRequestException('Tenant SMTP settings are not verified. Please verify credentials before launching a campaign.');
    }

    const decryptedPassword = this.crypto.decrypt(setting.passwordEncrypted);

    return nodemailer.createTransport({
      host: setting.host,
      port: setting.port,
      secure: setting.secure,
      auth: {
        user: setting.username,
        pass: decryptedPassword,
      },
      connectionTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
}
