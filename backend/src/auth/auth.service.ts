import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpService } from '../smtp/smtp.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private smtpService: SmtpService,
    private notificationsService: NotificationsService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role, 
      tenantId: user.tenantId,
      permissions: user.permissions || [] 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicUrl: user.profilePicUrl || null,
        permissions: user.permissions || []
      }
    };
  }

  async signupTenant(data: any) {
    const { businessName, name, email, password } = data;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      // Check for default plan
      const defaultPlan = await prisma.plan.findFirst({
        where: { isDefault: true, isActive: true }
      });

      // If the default plan is a paid plan (> 0 BDT), they do not get a free trial and must pay immediately
      const isPaidDefault = defaultPlan && Number(defaultPlan.priceMonthlyBdt) > 0;
      const trialEndsAt = isPaidDefault 
        ? new Date(Date.now() - 1000) // set trial to past (expired)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const tenant = await prisma.tenant.create({
        data: {
          businessName,
          trialEndsAt,
          planId: defaultPlan?.id || null
        }
      });

      if (defaultPlan) {
        // Create subscription. Status is 'past_due' (requires payment) if paid, or 'active' if free.
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
        await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: defaultPlan.id,
            status: isPaidDefault ? 'past_due' : 'active',
            billingCycle: 'monthly',
            currentPeriodEnd
          }
        });
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'owner',
          tenantId: tenant.id
        }
      });

      return newUser;
    });

    // Send welcome email (async fire-and-forget so signup doesn't block if SMTP is slow/failing)
    this.smtpService.triggerWelcomeEmail(email, name).catch(err => {
      console.error('Welcome email dispatch failed:', err);
    });

    // Send superadmin notification about new signup
    this.notificationsService.createSystemNotificationForSuperadmins(
      'New Tenant Registered',
      `${name} has registered a new workspace: ${businessName} (${email})`,
      'signup'
    ).catch(err => {
      console.error('Superadmin signup notification failed:', err);
    });

    return this.login(user);
  }

  async seedSuperadmin() {
    const existing = await this.usersService.findByEmail('admin@platform.com');
    if (existing) {
      await this.prisma.user.update({
        where: { id: existing.id },
        data: { permissions: ['*'] }
      });
      return { message: 'Superadmin updated with full permissions.' };
    }
    const hash = await bcrypt.hash('supersecret', 10);
    const user = await this.usersService.create({
      email: 'admin@platform.com',
      passwordHash: hash,
      name: 'Super Admin',
      role: 'superadmin',
      tenantId: null, // Null for superadmin
      permissions: ['*']
    });
    return { message: 'Superadmin created successfully. Email: admin@platform.com, Password: supersecret' };
  }
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicUrl: true,
        permissions: true,
        tenantId: true,
        tenant: {
          select: {
            businessName: true,
            brandName: true,
            address: true,
            phoneNo: true,
            ownerName: true,
            employeeCount: true,
            businessNature: true,
            isOnboarded: true,
            planId: true,
            plan: {
              select: {
                name: true,
                nameBn: true
              }
            }
          }
        }
      }
    });
    return user;
  }

  async updateOnboarding(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId) throw new UnauthorizedException('Tenant not found');

    const updateTenantData: any = {
      isOnboarded: true
    };
    if (data.brandName !== undefined) updateTenantData.brandName = data.brandName;
    if (data.address !== undefined) updateTenantData.address = data.address;
    if (data.phoneNo !== undefined) updateTenantData.phoneNo = data.phoneNo;
    if (data.ownerName !== undefined) updateTenantData.ownerName = data.ownerName;
    if (data.employeeCount !== undefined) updateTenantData.employeeCount = data.employeeCount;
    if (data.businessNature !== undefined) updateTenantData.businessNature = data.businessNature;

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: updateTenantData
    });

    if (data.ownerName) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: data.ownerName }
      });
    }

    return { success: true };
  }

  async getSetupStatus(tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant ID required');

    const [tenant, channelCount, aiAssistant, productCount, leadCount, userCount] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { isOnboarded: true } }),
      this.prisma.channelConnection.count({ where: { tenantId } }),
      this.prisma.aiAssistant.findFirst({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } })
    ]);

    return {
      hasBusinessProfile: tenant?.isOnboarded || false,
      hasConnectedChannel: channelCount > 0,
      hasConfiguredAi: !!aiAssistant,
      hasNamedAgent: !!aiAssistant?.agentName,
      hasCreatedProduct: productCount > 0,
      hasCreatedLead: leadCount > 0,
      hasInvitedTeam: userCount > 1
    };
  }

  async updateProfile(userId: string, data: { name?: string }, avatarFilename?: string) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (avatarFilename) updateData.profilePicUrl = `/uploads/avatars/${avatarFilename}`;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePicUrl: true,
        permissions: true,
        tenantId: true
      }
    });
    return user;
  }

  async changePassword(userId: string, data: any) {
    const { currentPassword, newPassword } = data;
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid current password');

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { success: true, message: 'If an account exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires }
    });

    const frontendUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(':3001', ':3000')
      : 'https://zinichat.com';
      
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.smtpService.triggerPasswordResetEmail(user.email, user.name, resetLink);

    // Also send an in-app system notification to the user
    await this.notificationsService.createNotification(
      user.id,
      'Password Reset Requested',
      'We received a request to reset your password. If this was not you, please contact support.',
      'info'
    ).catch((err: any) => console.error('Notification failed:', err));

    return { success: true, message: 'If an account exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gt: new Date() } // Not expired
      }
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    await this.notificationsService.createNotification(
      user.id,
      'Password Reset Successful',
      'Your password has been successfully reset. You can now log in with your new password.',
      'info'
    ).catch((err: any) => console.error('Notification failed:', err));

    return { success: true, message: 'Password has been reset successfully. You can now log in.' };
  }

  // Check public config
  async getGoogleConfig() {
    const config = await this.prisma.googleAuthConfig.findFirst();
    return {
      isEnabled: config ? config.isEnabled : false,
      clientId: config ? config.clientId : ''
    };
  }

  // Get superadmin settings
  async getGoogleSettings() {
    const config = await this.prisma.googleAuthConfig.findFirst();
    return config || { clientId: '', clientSecret: '', isEnabled: false };
  }

  // Save/update settings
  async updateGoogleSettings(data: any) {
    const config = await this.prisma.googleAuthConfig.findFirst();
    if (config) {
      return this.prisma.googleAuthConfig.update({
        where: { id: config.id },
        data: {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          isEnabled: !!data.isEnabled
        }
      });
    } else {
      return this.prisma.googleAuthConfig.create({
        data: {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          isEnabled: !!data.isEnabled
        }
      });
    }
  }

  // Google OAuth token validation
  async googleCallback(token: string) {
    if (!token) throw new BadRequestException('Google token is missing');

    const config = await this.prisma.googleAuthConfig.findFirst();
    if (!config || !config.isEnabled) {
      throw new BadRequestException('Google authentication is not enabled on this platform');
    }

    try {
      // Validate token with Google APIs
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      if (!verifyRes.ok) {
        throw new BadRequestException('Invalid Google token');
      }

      const decoded: any = await verifyRes.json();
      if (decoded.aud !== config.clientId) {
        throw new BadRequestException('Google token audience mismatch');
      }

      const { email, name, picture } = decoded;

      // Check if user already exists
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        // Check for default plan
        const defaultPlan = await this.prisma.plan.findFirst({
          where: { isDefault: true, isActive: true }
        });

        const tenant = await this.prisma.tenant.create({
          data: {
            businessName: `${name}'s Workspace`,
            planId: defaultPlan?.id || null
          }
        });

        if (defaultPlan) {
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
          await this.prisma.subscription.create({
            data: {
              tenantId: tenant.id,
              planId: defaultPlan.id,
              status: 'active',
              billingCycle: 'monthly',
              currentPeriodEnd
            }
          });
        }

        // Generate a random password hash for OAuth users
        const randomPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        user = await this.prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: 'admin', // Owner of the workspace
            tenantId: tenant.id,
            profilePicUrl: picture || null
          }
        });

        // Trigger welcome email asynchronously
        this.smtpService.triggerWelcomeEmail(email, name).catch(err => {
          console.error('OAuth welcome email dispatch failed:', err);
        });

        // Trigger signup notification for superadmins
        this.notificationsService.createSystemNotificationForSuperadmins(
          'New Google Signup',
          `${name} (${email}) registered a workspace via Google`,
          'signup'
        ).catch(err => {
          console.error('Google signup superadmin notification failed:', err);
        });
      }

      return this.login(user);
    } catch (err) {
      throw new UnauthorizedException(err.message || 'Google OAuth failed');
    }
  }

  // Get superadmin settings for Facebook Auth
  async getFacebookSettings() {
    const config = await this.prisma.facebookAuthConfig.findFirst();
    return config || { appId: '', appSecret: '', isEnabled: false };
  }

  // Save/update settings for Facebook Auth
  async updateFacebookSettings(data: any) {
    const config = await this.prisma.facebookAuthConfig.findFirst();
    if (config) {
      return this.prisma.facebookAuthConfig.update({
        where: { id: config.id },
        data: {
          appId: data.appId,
          appSecret: data.appSecret,
          isEnabled: !!data.isEnabled
        }
      });
    } else {
      return this.prisma.facebookAuthConfig.create({
        data: {
          appId: data.appId,
          appSecret: data.appSecret,
          isEnabled: !!data.isEnabled
        }
      });
    }
  }
}
