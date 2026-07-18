import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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

  @Get('payments')
  @Roles('superadmin')
  @RequirePermissions('manage:billing')
  getPayments() {
    return this.billingService.getPayments();
  }

  @Get('quotas')
  // Available to all authenticated users (agents/admins) to check their own tenant limits
  getQuotas(@Request() req: any) {
    return this.billingService.getTenantQuotas(req.user.tenantId);
  }
}
