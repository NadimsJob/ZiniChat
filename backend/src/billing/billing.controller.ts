import { Controller, Get, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscriptions')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getSubscriptions() {
    return this.billingService.getSubscriptions();
  }

  @Get('admin/overview')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getAdminBillingOverview() {
    return this.billingService.getAdminBillingOverview();
  }

  @Get('payments')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getPayments() {
    return this.billingService.getPayments();
  }

  @Post('admin/extend-subscription')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  extendSubscription(
    @Body() body: { tenantId: string; days: number },
    @Request() req: any
  ) {
    if (!body.tenantId || !body.days || Number(body.days) <= 0) {
      throw new BadRequestException('Valid tenantId and days (> 0) are required');
    }
    return this.billingService.extendSubscription(body.tenantId, Number(body.days), req.user?.id);
  }

  @Get('quotas')
  // Available to all authenticated users (agents/admins) to check their own tenant limits
  getQuotas(@Request() req: any) {
    return this.billingService.getTenantQuotas(req.user.tenantId);
  }
}
