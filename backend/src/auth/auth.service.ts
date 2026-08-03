import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Optional, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
    private notificationsService: NotificationsService,
    @Optional() @InjectQueue('meta-pixel') private metaPixelQueue?: Queue,
    @Optional() @InjectQueue('google-analytics') private gaQueue?: Queue
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash && await bcrypt.compare(pass, user.passwordHash)) {
      if (user.tenantId && user.role !== 'superadmin') {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: user.tenantId }
        });
        if (tenant && tenant.status === 'suspended') {
          throw new UnauthorizedException('Account suspended');
        }
      }
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    if (user.tenantId && user.role !== 'superadmin') {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId }
      });
      if (tenant && tenant.status === 'suspended') {
        throw new UnauthorizedException('Account suspended');
      }
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role, 
      tenantId: user.tenantId,
      permissions: user.permissions || [] 
    };

    // First Login Acquisition Tracking (Fire and forget)
    if (user.id && user.firstLoginAt === null) {
      this.prisma.user.update({
        where: { id: user.id },
        data: { firstLoginAt: new Date() }
      }).then(() => {
        if (this.metaPixelQueue) {
          this.metaPixelQueue.add('trackAcquisitionEvent', {
            eventName: 'Purchase', // Facebook treats key conversion as Purchase
            tenantEmail: user.email,
            tenantId: user.tenantId,
            eventValue: 1,
          }, { attempts: 3, backoff: { type: 'exponential', delay: 3000 } }).catch(err => {
            console.error('Error queueing first login Meta acquisition event:', err);
          });
        }
        if (this.gaQueue) {
          this.gaQueue.add('sendGAEvent', {
            eventName: 'purchase', // GA standard conversion event name
            tenantEmail: user.email,
            tenantId: user.tenantId,
            eventParams: { value: 1, currency: 'BDT' }
          }, { attempts: 2, backoff: { type: 'exponential', delay: 1000 } }).catch(err => {
            console.error('Error queueing first login GA acquisition event:', err);
          });
        }
      }).catch(err => {
        console.error('Error updating user firstLoginAt:', err);
      });
    }

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
    const { businessName, name, email, password, phoneNo, planId } = data;

    if (!phoneNo) {
      throw new BadRequestException('Phone number is required');
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    const user = await this.prisma.$transaction(async (prisma) => {
      let selectedPlan = null;
      if (planId) {
        selectedPlan = await prisma.plan.findUnique({ where: { id: planId } });
      }
      
      const defaultPlan = await prisma.plan.findFirst({
        where: { isDefault: true, isActive: true }
      });

      let initialPlan = selectedPlan;
      if (!initialPlan || !initialPlan.isActive || (Number(initialPlan.priceMonthlyBdt) > 0 && (initialPlan.trialDays || 0) <= 0)) {
        initialPlan = defaultPlan || initialPlan;
      }

      if (!initialPlan) {
        initialPlan = await prisma.plan.findFirst({ where: { isActive: true } });
      }

      const isPaid = initialPlan && Number(initialPlan.priceMonthlyBdt) > 0;
      const trialDays = initialPlan?.trialDays || 0;
      
      let status = 'active';
      let trialEndsAt = null;

      if (isPaid && trialDays > 0) {
        status = 'trialing';
        trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
      } else {
        status = 'active';
        trialEndsAt = new Date();
      }

      const defaultAiConfig = await prisma.aiConfig.findFirst({
        where: { isActive: true, isSupportDefault: false }
      });

      const tenant = await prisma.tenant.create({
        data: {
          businessName,
          phoneNo,
          trialEndsAt,
          planId: initialPlan?.id || null,
          customAiConfigId: defaultAiConfig?.id || null
        }
      });

      if (initialPlan) {
        const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
        await prisma.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: initialPlan.id,
            status,
            billingCycle: 'monthly',
            currentPeriodStart: new Date(),
            currentPeriodEnd
          }
        });
      }

      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'owner',
          tenantId: tenant.id,
          emailVerificationToken: verifyToken,
          emailVerificationExpires: verifyExpires
        }
      });

      return newUser;
    });

    // Send welcome email (async fire-and-forget so signup doesn't block if queue is slow/failing)
    this.smtpService.triggerWelcomeEmail(email, businessName).catch(err => {
      console.error('Welcome email dispatch failed:', err);
    });

    // Send verification email
    const frontendUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace(':3001', ':3000')
      : 'https://zinichat.com';
    const verifyLink = `${frontendUrl}/verify-email?token=${user.emailVerificationToken}`;
    this.smtpService.triggerVerifyEmail(email, name, verifyLink).catch(err => {
      console.error('Verify email dispatch failed:', err);
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
    return { message: 'Superadmin created successfully. Email: admin@platform.com' };
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
        passwordHash: true,
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
                id: true,
                name: true,
                nameBn: true
              }
            }
          }
        }
      }
    });

    if (user && user.tenantId && user.tenant) {
      const activeSub = await this.prisma.subscription.findFirst({
        where: {
          tenantId: user.tenantId,
          status: { in: ['active', 'trialing'] }
        },
        include: { plan: true },
        orderBy: { currentPeriodEnd: 'desc' }
      });

      if (activeSub && activeSub.plan) {
        (user.tenant as any).plan = {
          id: activeSub.plan.id,
          name: activeSub.plan.name,
          nameBn: activeSub.plan.nameBn
        };

        if (user.tenant.planId !== activeSub.planId) {
          await this.prisma.tenant.update({
            where: { id: user.tenantId },
            data: { planId: activeSub.planId }
          }).catch(err => console.error('Failed to sync tenant planId in getMe', err));
        }
      }
    }

    if (user) {
      (user as any).hasPassword = !!user.passwordHash;
      
      let features: string[] = [];
      if (user.role === 'superadmin') {
        features = [
          'inbox_smart_tabs', 'inbox_notes', 'inbox_ai_summary', 'inbox_activity_timeline',
          'inbox_shared_files', 'inbox_multi_agent_collaborators', 'inbox_multi_ai_assistant_picker', 'agent_presence',
          'ai_tool_order_placement', 'ai_tool_image_reading', 'ai_tool_support_detection', 'ai_tool_product_matching',
          'ai_assistant', 'platform_support_ai', 'messenger', 'whatsapp', 'whatsapp_qr', 'whatsapp_widget',
          'website_widget', 'instagram_dm', 'lead_manage', 'commerce', 'broadcast', 'team_management', 'contact_labels'
        ];
      } else if (user.tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          include: {
            subscriptions: { where: { status: { in: ['active', 'trialing'] } }, include: { plan: true }, take: 1 }
          }
        });
        if (tenant) {
          if (tenant.customFeatures !== null && Array.isArray(tenant.customFeatures)) {
            features = tenant.customFeatures as string[];
          } else if (tenant.subscriptions?.[0]?.plan?.features && Array.isArray(tenant.subscriptions[0].plan.features)) {
            features = tenant.subscriptions[0].plan.features as string[];
          }
        }
      }
      (user as any).features = features;
    }

    if (!user) return null;
    const { passwordHash, ...safeUser } = user as any;
    return safeUser;
  }

  async updateOnboarding(userId: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId) throw new UnauthorizedException('Tenant not found');

    if (!user.passwordHash) {
      if (!data.password) {
        throw new BadRequestException('Password is required');
      }
      const passwordHash = await bcrypt.hash(data.password, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
    }

    const updateTenantData: any = {
      isOnboarded: true
    };

    if (data.businessName !== undefined) updateTenantData.businessName = data.businessName;
    if (data.brandName !== undefined) updateTenantData.brandName = data.brandName;
    if (data.address !== undefined) updateTenantData.address = data.address;
    if (data.phoneNo !== undefined) updateTenantData.phoneNo = data.phoneNo;
    if (data.ownerName !== undefined) updateTenantData.ownerName = data.ownerName;
    if (data.employeeCount !== undefined) updateTenantData.employeeCount = data.employeeCount;
    if (data.businessNature !== undefined) updateTenantData.businessNature = data.businessNature;
    if (data.logoUrl !== undefined) updateTenantData.logoUrl = data.logoUrl;

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

  async updateTenantLogo(userId: string, logoUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.tenantId) throw new UnauthorizedException('Tenant not found');

    const tenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { logoUrl }
    });

    return { success: true, logoUrl: tenant.logoUrl };
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

    if (user.passwordHash) {
      if (!currentPassword) throw new UnauthorizedException('Current password is required');
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) throw new UnauthorizedException('Invalid current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async forgotPassword(email: string) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
      throw new BadRequestException('Email address is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' }
      }
    });

    if (!user) {
      throw new NotFoundException('No account found with this email address. Please sign up.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordExpires }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://zinichat.com';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.smtpService.triggerPasswordResetEmail(user.email, user.name || 'User', resetLink);

    // Also send an in-app system notification to the user
    await this.notificationsService.createNotification(
      user.id,
      'Password Reset Requested',
      'We received a request to reset your password. If this was not you, please contact support.',
      'info'
    ).catch((err: any) => console.error('Notification failed:', err));

    return { success: true, message: 'Password reset link sent successfully! Please check your email inbox.' };
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

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    const user = await this.prisma.user.findFirst({
      where: { 
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() }
      }
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerificationToken: null,
        emailVerificationExpires: null,
        isEmailVerified: true
      }
    });

    // Notify the user their email is verified
    this.notificationsService.createNotification(
      user.id,
      '✅ Email Verified',
      'Your email address has been successfully verified. Your account is now fully activated.',
      'info'
    ).catch(() => {});

    // Notify superadmins
    this.notificationsService.createSystemNotificationForSuperadmins(
      'Tenant Email Verified',
      `${user.name} (${user.email}) has verified their email address.`,
      'signup'
    ).catch(() => {});
    
    return { success: true, message: 'Email verified successfully' };
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

  async googleCallback(token: string, planId?: string) {
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
        let selectedPlan = null;
        if (planId) {
          selectedPlan = await this.prisma.plan.findUnique({ where: { id: planId } });
        }

        const defaultPlan = await this.prisma.plan.findFirst({
          where: { isDefault: true, isActive: true }
        });

        let initialPlan = selectedPlan;
        if (!initialPlan || !initialPlan.isActive || (Number(initialPlan.priceMonthlyBdt) > 0 && (initialPlan.trialDays || 0) <= 0)) {
          initialPlan = defaultPlan || initialPlan;
        }

        if (!initialPlan) {
          initialPlan = await this.prisma.plan.findFirst({ where: { isActive: true } });
        }

        const isPaid = initialPlan && Number(initialPlan.priceMonthlyBdt) > 0;
        const trialDays = initialPlan?.trialDays || 0;
        
        let status = 'active';
        let trialEndsAt = null;

        if (isPaid && trialDays > 0) {
          status = 'trialing';
          trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);
        } else {
          status = 'active';
          trialEndsAt = new Date();
        }

        const defaultAiConfig = await this.prisma.aiConfig.findFirst({
          where: { isActive: true, isSupportDefault: false }
        });

        const tenant = await this.prisma.tenant.create({
          data: {
            businessName: `${name}'s Workspace`,
            trialEndsAt,
            planId: initialPlan?.id || null,
            customAiConfigId: defaultAiConfig?.id || null
          }
        });

        if (initialPlan) {
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 1 month
          await this.prisma.subscription.create({
            data: {
              tenantId: tenant.id,
              planId: initialPlan.id,
              status,
              billingCycle: 'monthly',
              currentPeriodStart: new Date(),
              currentPeriodEnd
            }
          });
        }

        // OAuth users don't have a password initially
        const passwordHash = '';

        user = await this.prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: 'admin', // Owner of the workspace
            tenantId: tenant.id,
            profilePicUrl: picture || null,
            isEmailVerified: true // OAuth trusted
          }
        });

        // Trigger welcome email asynchronously
        this.smtpService.triggerWelcomeEmail(email, tenant.businessName).catch(err => {
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
    return config || { appId: '', appSecret: '', whatsappConfigId: '', isEnabled: false };
  }

  // Get public Facebook configuration (for tenants)
  async getPublicFacebookConfig() {
    const config = await this.prisma.facebookAuthConfig.findFirst();
    return {
      appId: config?.appId || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
      whatsappConfigId: config?.whatsappConfigId || process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '',
      isEnabled: config?.isEnabled ?? true,
    };
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
          whatsappConfigId: data.whatsappConfigId,
          isEnabled: !!data.isEnabled
        }
      });
    } else {
      return this.prisma.facebookAuthConfig.create({
        data: {
          appId: data.appId,
          appSecret: data.appSecret,
          whatsappConfigId: data.whatsappConfigId,
          isEnabled: !!data.isEnabled
        }
      });
    }
  }
}
