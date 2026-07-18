import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Only enforce subscription/trial on WRITE operations (POST, PATCH, PUT, DELETE)
    // Read operations (GET) are allowed so users can see their data before paying.
    if (request.method === 'GET' || request.method === 'OPTIONS') {
      return true;
    }

    const user = request.user;
    if (!user) return true; // Let standard auth handle unauthenticated users
    if (user.role === 'superadmin') return true; // Superadmins are immune
    if (!user.tenantId) return true;

    // Check tenant's trial status and subscription
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        subscriptions: {
          where: { status: 'active', currentPeriodEnd: { gt: new Date() } },
          take: 1
        }
      }
    });

    if (!tenant) return false;

    const hasActiveSubscription = tenant.subscriptions.length > 0;
    if (hasActiveSubscription) {
      return true;
    }

    // No active subscription, check trial
    const now = new Date();
    if (tenant.trialEndsAt && tenant.trialEndsAt > now) {
      return true; // Still in trial
    }

    // Trial expired (or never had one) and no active subscription
    throw new HttpException({
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      message: 'Trial expired. Please subscribe to continue using this feature.',
      code: 'TRIAL_EXPIRED'
    }, HttpStatus.PAYMENT_REQUIRED);
  }
}
