import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, UseGuards, Req } from '@nestjs/common';
import { MfsPaymentsService } from './mfs-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('mfs-payments')
export class MfsPaymentsController {
  constructor(private readonly mfsPaymentsService: MfsPaymentsService) {}

  // 1. MFS Accounts Management (Superadmin Only)
  @Get('accounts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants') // Or appropriate billing permission
  async getAccounts() {
    return this.mfsPaymentsService.getAccounts();
  }

  @Post('accounts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async createAccount(@Body() data: {
    provider: string;
    accountType: string;
    number: string;
    merchantId?: string;
    bankName?: string;
    routingNumber?: string;
    qrCodeUrl?: string;
    isActive?: boolean;
  }) {
    return this.mfsPaymentsService.createAccount(data);
  }

  @Patch('accounts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async updateAccount(
    @Param('id') id: string,
    @Body() data: {
      provider?: string;
      accountType?: string;
      number?: string;
      merchantId?: string;
      bankName?: string;
      routingNumber?: string;
      qrCodeUrl?: string;
      isActive?: boolean;
    },
  ) {
    return this.mfsPaymentsService.updateAccount(id, data);
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async removeAccount(@Param('id') id: string) {
    return this.mfsPaymentsService.removeAccount(id);
  }

  // 2. Incoming Transactions logs (Superadmin Only)
  @Get('transactions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async getTransactions() {
    return this.mfsPaymentsService.getTransactions();
  }

  // Get QR payload for checkout page
  @Get('qr-payload/:paymentId')
  @UseGuards(JwtAuthGuard)
  async getPaymentQrPayload(@Param('paymentId') paymentId: string) {
    return this.mfsPaymentsService.getPaymentQrPayload(paymentId);
  }

  // 3. SMS Webhook Endpoint (Public, secured by header token)
  @Post('sms-webhook')
  async syncSmsTransaction(
    @Headers('X-SMS-GATEWAY-API-KEY') apiKey: string,
    @Body() data: {
      trxId: string;
      provider: string;
      accountType?: string;
      amount: number;
      senderNumber?: string;
      smsBody: string;
    },
  ) {
    return this.mfsPaymentsService.syncSmsTransaction(apiKey, data);
  }

  // 4. User Verification (Authenticated Tenants)
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @Req() req: any,
    @Body() data: {
      paymentId: string;
      trxId: string;
    },
  ) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    return this.mfsPaymentsService.verifyPayment(userId, tenantId, data.paymentId, data.trxId);
  }

  // 5. Superadmin Manual Claim (Superadmin Only)
  @Post('manual-claim')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('manage:tenants')
  async manualClaimTransaction(
    @Req() req: any,
    @Body() data: {
      trxId: string;
      paymentId: string;
    },
  ) {
    const userId = req.user.id;
    return this.mfsPaymentsService.manualClaimTransaction(userId, data.trxId, data.paymentId);
  }
}
