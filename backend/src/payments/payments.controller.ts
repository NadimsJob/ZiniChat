import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('config')
  async getConfig() {
    return this.paymentsService.getConfig();
  }

  @Post('manual')
  async submitManualPayment(@Req() req: any, @Body() body: { planId: string, trxId: string, billingCycle: string, couponCode?: string }) {
    const tenantId = req.user.tenantId;
    return this.paymentsService.submitManualPayment(tenantId, body.planId, body.trxId, body.billingCycle || 'monthly', body.couponCode);
  }

  @Post('sandbox')
  async submitSandboxPayment(@Req() req: any, @Body() body: { planId: string, billingCycle: string, couponCode?: string }) {
    const tenantId = req.user.tenantId;
    return this.paymentsService.submitSandboxPayment(tenantId, body.planId, body.billingCycle || 'monthly', body.couponCode);
  }

  // Admin routes
  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage:billing')
  @Get('admin/pending')
  async getPendingPayments() {
    return this.paymentsService.getPendingManualPayments();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage:billing')
  @Post('admin/:id/approve')
  async approvePayment(@Param('id') id: string) {
    return this.paymentsService.approveManualPayment(id);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions('manage:site')
  @Post('admin/config')
  async updateConfig(@Body() body: any) {
    return this.paymentsService.updateConfig(body);
  }
}
